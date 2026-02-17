// ─── Shadow Engine ────────────────────────────────────────────────────────────
// All functions here are pure — same inputs always produce same outputs.
// Nothing reads from or writes to Firestore.
//
// The engine works in two stages:
//   1. applyShadowChanges()  → produces a modified allocations array
//   2. computeImpact()       → diffs real vs shadow to produce the impact report
//
// All other components read from the impact report, never from raw data directly.

// ─── Stage 1: Apply changes to produce shadow allocations ────────────────────

/**
 * Takes the real allocations array and an ordered list of change cards,
 * applies each change in sequence, and returns a new allocations array.
 * The real array is never mutated.
 */
export const applyShadowChanges = (realAllocations, changes, teachers) => {
  // Deep clone so we never mutate real data
  let shadow = realAllocations.map((a) => ({ ...a }));

  changes.forEach((change) => {
    if (change.type === "reassign") {
      shadow = applyReassign(shadow, change);
    }
    if (change.type === "maxload") {
      // Max load changes don't touch allocations directly —
      // they affect teacher capacity which is handled in computeImpact.
      // Nothing to do here.
    }
  });

  return shadow;
};

/**
 * Applies a single reassign change to the shadow allocations.
 * Reduces fromTeacher's periods in the cell, increases toTeacher's.
 * Creates a new allocation record for toTeacher if one doesn't exist.
 * Removes a record if it reaches 0 periods.
 */
const applyReassign = (allocations, change) => {
  const {
    fromTeacherId,
    toTeacherId,
    gradeId,
    subjectId,
    periods,
    gradeName,
    subjectName,
    toTeacherName,
  } = change;
  let result = allocations.map((a) => ({ ...a }));

  // 1. Reduce or remove the FROM teacher's allocation in this cell
  const fromAlloc = result.find(
    (a) =>
      a.teacherId === fromTeacherId &&
      a.gradeId === gradeId &&
      a.subjectId === subjectId,
  );

  if (fromAlloc) {
    const newPeriods = (parseInt(fromAlloc.periodsPerWeek) || 0) - periods;
    if (newPeriods <= 0) {
      // Remove allocation entirely
      result = result.filter(
        (a) =>
          !(
            a.teacherId === fromTeacherId &&
            a.gradeId === gradeId &&
            a.subjectId === subjectId
          ),
      );
    } else {
      result = result.map((a) =>
        a.teacherId === fromTeacherId &&
        a.gradeId === gradeId &&
        a.subjectId === subjectId
          ? { ...a, periodsPerWeek: newPeriods }
          : a,
      );
    }
  }

  // 2. Add periods to the TO teacher's allocation in this cell
  const toAlloc = result.find(
    (a) =>
      a.teacherId === toTeacherId &&
      a.gradeId === gradeId &&
      a.subjectId === subjectId,
  );

  if (toAlloc) {
    // Teacher already has periods in this cell — increase them
    result = result.map((a) =>
      a.teacherId === toTeacherId &&
      a.gradeId === gradeId &&
      a.subjectId === subjectId
        ? { ...a, periodsPerWeek: (parseInt(a.periodsPerWeek) || 0) + periods }
        : a,
    );
  } else {
    // Create a new shadow allocation record
    result.push({
      id: `shadow_${toTeacherId}_${gradeId}_${subjectId}`,
      teacherId: toTeacherId,
      teacherName: toTeacherName || "",
      gradeId,
      gradeName: gradeName || "",
      subjectId,
      subjectName: subjectName || "",
      periodsPerWeek: periods,
      isShadow: true, // Flag so the matrix can identify new records
    });
  }

  return result;
};

// ─── Stage 2: Compute the impact report ──────────────────────────────────────

/**
 * Diffs real allocations vs shadow allocations and produces a structured
 * impact report consumed by ImpactSummary and ImpactMatrix.
 */
export const computeImpact = (
  realAllocations,
  shadowAllocations,
  teachers,
  changes,
  grades,
  subjects,
) => {
  // Build shadow teacher max loads (modified by maxload change cards)
  const shadowMaxLoads = buildShadowMaxLoads(teachers, changes);

  // Compute per-teacher load in both states
  const teacherImpacts = computeTeacherImpacts(
    teachers,
    realAllocations,
    shadowAllocations,
    shadowMaxLoads,
  );

  // Compute per-cell changes
  const cellImpacts = computeCellImpacts(
    grades,
    subjects,
    realAllocations,
    shadowAllocations,
    teachers,
  );

  // School-wide summary numbers
  const summary = computeSummary(
    grades,
    subjects,
    realAllocations,
    shadowAllocations,
    teacherImpacts,
  );

  return {
    teacherImpacts, // Map of teacherId → impact object
    cellImpacts, // Map of `${gradeId}_${subjectId}` → impact object
    summary, // Headline numbers
    shadowMaxLoads, // Map of teacherId → new max load
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a map of teacherId → effective max load,
 * applying any maxload change cards on top of teacher.maxLoad.
 */
const buildShadowMaxLoads = (teachers, changes) => {
  const map = {};
  teachers.forEach((t) => {
    map[t.id] = parseInt(t.maxLoad) || 30;
  });
  changes
    .filter((c) => c.type === "maxload")
    .forEach((c) => {
      map[c.teacherId] = parseInt(c.newMaxLoad) || map[c.teacherId];
    });
  return map;
};

/**
 * For every teacher, computes their real load, shadow load, real max,
 * shadow max, and the resulting status change.
 */
const computeTeacherImpacts = (
  teachers,
  realAllocations,
  shadowAllocations,
  shadowMaxLoads,
) => {
  const map = {};

  teachers.forEach((t) => {
    const realLoad = sumLoad(realAllocations, t.id);
    const shadowLoad = sumLoad(shadowAllocations, t.id);
    const realMax = parseInt(t.maxLoad) || 30;
    const shadowMax = shadowMaxLoads[t.id] ?? realMax;

    const realPct = Math.round((realLoad / realMax) * 100);
    const shadowPct = Math.round((shadowLoad / shadowMax) * 100);

    const realStatus = loadStatus(realLoad, realMax);
    const shadowStatus = loadStatus(shadowLoad, shadowMax);

    const changed = realLoad !== shadowLoad || realMax !== shadowMax;

    map[t.id] = {
      teacher: t,
      realLoad,
      shadowLoad,
      realMax,
      shadowMax,
      realPct,
      shadowPct,
      realStatus,
      shadowStatus,
      changed,
      // Convenience flags
      becameOverloaded: shadowStatus === "over" && realStatus !== "over",
      wasRelieved: shadowStatus !== "over" && realStatus === "over",
      loadIncreased: shadowLoad > realLoad,
      loadDecreased: shadowLoad < realLoad,
      maxDecreased: shadowMax < realMax,
    };
  });

  return map;
};

/**
 * For every grade × subject cell, computes the real and shadow allocations
 * and classifies the change.
 */
const computeCellImpacts = (
  grades,
  subjects,
  realAllocations,
  shadowAllocations,
  teachers,
) => {
  const map = {};

  grades.forEach((grade) => {
    subjects.forEach((subject) => {
      if (!subject.gradeIds?.includes(grade.id)) return;

      const key = `${grade.id}_${subject.id}`;

      const realCellAllocs = realAllocations.filter(
        (a) => a.gradeId === grade.id && a.subjectId === subject.id,
      );
      const shadowCellAllocs = shadowAllocations.filter(
        (a) => a.gradeId === grade.id && a.subjectId === subject.id,
      );

      const detail = subject.gradeDetails?.find((g) => g.id === grade.id);
      const required = parseInt(detail?.periods) || 0;
      const realTotal = sumPeriods(realCellAllocs);
      const shadowTotal = sumPeriods(shadowCellAllocs);

      // Find teachers added or removed from this cell
      const realTeacherIds = new Set(realCellAllocs.map((a) => a.teacherId));
      const shadowTeacherIds = new Set(
        shadowCellAllocs.map((a) => a.teacherId),
      );

      const addedTeachers = [...shadowTeacherIds].filter(
        (id) => !realTeacherIds.has(id),
      );
      const removedTeachers = [...realTeacherIds].filter(
        (id) => !shadowTeacherIds.has(id),
      );
      const changedPeriods = [...shadowTeacherIds].filter((id) => {
        if (!realTeacherIds.has(id)) return false;
        const realP =
          realCellAllocs.find((a) => a.teacherId === id)?.periodsPerWeek || 0;
        const shadowP =
          shadowCellAllocs.find((a) => a.teacherId === id)?.periodsPerWeek || 0;
        return parseInt(realP) !== parseInt(shadowP);
      });

      const changed =
        addedTeachers.length > 0 ||
        removedTeachers.length > 0 ||
        changedPeriods.length > 0;

      // Check qualification of shadow teachers
      const unqualifiedTeachers = shadowCellAllocs
        .map((a) => {
          const teacher = teachers.find((t) => t.id === a.teacherId);
          const qualified = teacher?.subjectIds?.includes(subject.id);
          return qualified
            ? null
            : { teacherId: a.teacherId, teacherName: a.teacherName };
        })
        .filter(Boolean);

      // Cell status in shadow state
      const shadowCellStatus =
        shadowTotal === 0
          ? "empty"
          : shadowTotal < required
            ? "partial"
            : "full";

      const realCellStatus =
        realTotal === 0 ? "empty" : realTotal < required ? "partial" : "full";

      map[key] = {
        grade,
        subject,
        required,
        realTotal,
        shadowTotal,
        realCellAllocs,
        shadowCellAllocs,
        realCellStatus,
        shadowCellStatus,
        addedTeachers,
        removedTeachers,
        changedPeriods,
        unqualifiedTeachers,
        changed,
        // Convenience flags
        gapCreated: realCellStatus !== "empty" && shadowCellStatus === "empty",
        gapClosed: realCellStatus === "empty" && shadowCellStatus !== "empty",
        degraded: realCellStatus === "full" && shadowCellStatus !== "full",
        improved: realCellStatus !== "full" && shadowCellStatus === "full",
        hasConflict: unqualifiedTeachers.length > 0,
      };
    });
  });

  return map;
};

/**
 * Produces the four headline numbers shown in ImpactSummary.
 */
const computeSummary = (
  grades,
  subjects,
  realAllocations,
  shadowAllocations,
  teacherImpacts,
) => {
  let realTotalPeriods = 0;
  let shadowTotalPeriods = 0;
  let gapsCreated = 0;
  let gapsClosed = 0;
  let conflictsIntroduced = 0;

  grades.forEach((grade) => {
    subjects.forEach((subject) => {
      if (!subject.gradeIds?.includes(grade.id)) return;

      const detail = subject.gradeDetails?.find((g) => g.id === grade.id);
      const required = parseInt(detail?.periods) || 0;

      const realTotal = realAllocations
        .filter((a) => a.gradeId === grade.id && a.subjectId === subject.id)
        .reduce((s, a) => s + (parseInt(a.periodsPerWeek) || 0), 0);

      const shadowTotal = shadowAllocations
        .filter((a) => a.gradeId === grade.id && a.subjectId === subject.id)
        .reduce((s, a) => s + (parseInt(a.periodsPerWeek) || 0), 0);

      realTotalPeriods += realTotal;
      shadowTotalPeriods += shadowTotal;

      if (required > 0) {
        const wasGap = realTotal < required;
        const isGap = shadowTotal < required;
        if (!wasGap && isGap) gapsCreated++;
        if (wasGap && !isGap) gapsClosed++;
      }
    });
  });

  const overloadedBefore = Object.values(teacherImpacts).filter(
    (t) => t.realStatus === "over",
  ).length;
  const overloadedAfter = Object.values(teacherImpacts).filter(
    (t) => t.shadowStatus === "over",
  ).length;

  conflictsIntroduced = Object.values(teacherImpacts).filter(
    (t) => t.becameOverloaded,
  ).length;

  return {
    realTotalPeriods,
    shadowTotalPeriods,
    periodsDelta: shadowTotalPeriods - realTotalPeriods,
    gapsCreated,
    gapsClosed,
    overloadedBefore,
    overloadedAfter,
    overloadDelta: overloadedAfter - overloadedBefore,
    conflictsIntroduced,
    hasAnyChange:
      realTotalPeriods !== shadowTotalPeriods ||
      gapsCreated > 0 ||
      gapsClosed > 0 ||
      Object.values(teacherImpacts).some((t) => t.changed),
  };
};

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a single change card against the current shadow state.
 * Returns an array of warning strings (empty = no problems).
 * Used by ChangeBuilder to show inline warnings before a card is added.
 */
export const validateChange = (
  change,
  shadowAllocations,
  teachers,
  shadowMaxLoads,
) => {
  const warnings = [];

  if (change.type === "reassign") {
    const { fromTeacherId, toTeacherId, gradeId, subjectId, periods } = change;

    // Check FROM teacher actually has enough periods to give
    const fromAlloc = shadowAllocations.find(
      (a) =>
        a.teacherId === fromTeacherId &&
        a.gradeId === gradeId &&
        a.subjectId === subjectId,
    );
    const fromCurrent = parseInt(fromAlloc?.periodsPerWeek) || 0;
    if (fromCurrent < periods) {
      warnings.push(
        `Source teacher only has ${fromCurrent} period${fromCurrent !== 1 ? "s" : ""} in this cell — can't move ${periods}.`,
      );
    }

    // Check TO teacher is qualified for this subject
    const toTeacher = teachers.find((t) => t.id === toTeacherId);
    if (toTeacher && !toTeacher.subjectIds?.includes(subjectId)) {
      warnings.push(
        `${toTeacher.name} is not qualified to teach this subject.`,
      );
    }

    // Check TO teacher won't exceed their max load
    if (toTeacher) {
      const toCurrentLoad = sumLoad(shadowAllocations, toTeacherId);
      const toMax =
        shadowMaxLoads[toTeacherId] ?? (parseInt(toTeacher.maxLoad) || 30);
      if (toCurrentLoad + periods > toMax) {
        warnings.push(
          `This would push ${toTeacher.name} to ${toCurrentLoad + periods}/${toMax} periods — over their max load.`,
        );
      }
    }
  }

  if (change.type === "maxload") {
    const { teacherId, newMaxLoad } = change;
    const currentLoad = sumLoad(shadowAllocations, teacherId);
    if (newMaxLoad < currentLoad) {
      warnings.push(
        `New max of ${newMaxLoad} is below current load of ${currentLoad} periods — teacher will be over capacity.`,
      );
    }
    if (newMaxLoad <= 0) {
      warnings.push("Max load must be greater than 0.");
    }
  }

  return warnings;
};

// ─── Small pure utilities ─────────────────────────────────────────────────────

/** Sum all periods for a teacher across all their allocations */
export const sumLoad = (allocations, teacherId) =>
  allocations
    .filter((a) => a.teacherId === teacherId)
    .reduce((s, a) => s + (parseInt(a.periodsPerWeek) || 0), 0);

/** Sum all periods in a set of allocation records */
const sumPeriods = (allocations) =>
  allocations.reduce((s, a) => s + (parseInt(a.periodsPerWeek) || 0), 0);

/** Classify a load as under, good, warning, or over */
export const loadStatus = (load, max) => {
  const pct = (load / (max || 30)) * 100;
  if (pct > 100) return "over";
  if (pct > 90) return "warning";
  if (pct > 60) return "good";
  return "under";
};

/** Status → Tailwind colour classes for consistent styling across components */
export const statusColors = {
  over: {
    bg: "bg-red-100",
    border: "border-red-300",
    text: "text-red-700",
    bar: "bg-red-400",
  },
  warning: {
    bg: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-700",
    bar: "bg-amber-400",
  },
  good: {
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-700",
    bar: "bg-emerald-400",
  },
  under: {
    bg: "bg-blue-100",
    border: "border-blue-300",
    text: "text-blue-700",
    bar: "bg-blue-400",
  },
};
