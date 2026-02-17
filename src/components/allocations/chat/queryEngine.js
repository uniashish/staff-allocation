import { matchName, getLoad, getMax } from "./shared/helpers";

// ─── Central pattern router ───────────────────────────────────────────────────
// Receives the raw user input + all data, returns a result object.
// The result object's `type` field tells index.jsx which renderer to use.
export const analyzeQuery = (
  input,
  { grades, subjects, teachers, allocations, departments = [] },
) => {
  const raw = input.trim();

  // Convenience wrappers so callers don't pass allocations every time
  const load = (teacherId) => getLoad(teacherId, allocations);
  const max = (teacher) => getMax(teacher);

  // ── 1: Overloaded teachers ──────────────────────────────────────────────────
  if (
    /who is overload|overwork|over capacity|over 90|above (90|max)|most loaded|busiest/i.test(
      raw,
    )
  ) {
    return buildOverloaded(teachers, load, max);
  }

  // ── 2: Underutilised teachers ───────────────────────────────────────────────
  if (
    /who has free|underutil|free period|can take more|least loaded|available teacher|who is free|light load/i.test(
      raw,
    )
  ) {
    return buildUnderutilised(teachers, load, max);
  }

  // ── 3: Gaps / unallocated cells ─────────────────────────────────────────────
  if (
    /unassign|unalloc|what.*gap|show gap|missing assign|not.*cover|incomplete cell/i.test(
      raw,
    )
  ) {
    return buildGaps(grades, subjects, allocations);
  }

  // ── 4: Subject coverage ─────────────────────────────────────────────────────
  const coverageMatch = raw.match(
    /(?:is |coverage for |how.*covered? is |check coverage.*?for )?(.+?) (?:fully covered|coverage|covered\?|complete\?)/i,
  );
  if (coverageMatch) {
    const subject = matchName(coverageMatch[1], subjects);
    if (subject) return buildSubjectCoverage(subject, grades, allocations);
  }

  // ── 5: Find substitute ──────────────────────────────────────────────────────
  const findSubMatch = raw.match(
    /who can (?:cover|substitute|take) (.+?) in (.+?) (?:for|in|-|–) (.+)/i,
  );
  if (findSubMatch) {
    const teacher = matchName(findSubMatch[1], teachers);
    const grade = matchName(findSubMatch[2], grades);
    const subject = matchName(findSubMatch[3], subjects);
    if (!teacher) return notFound("teacher", findSubMatch[1]);
    if (!grade) return notFound("grade", findSubMatch[2]);
    if (!subject) return notFound("subject", findSubMatch[3]);
    return buildFindSubstitute(
      teacher,
      grade,
      subject,
      teachers,
      allocations,
      load,
      max,
    );
  }

  // ── 6: Department load ──────────────────────────────────────────────────────
  const deptMatch = raw.match(
    /(?:show |department |dept )?(.+?) (?:department|dept) (?:load|summary|workload)/i,
  );
  if (deptMatch) {
    return buildDepartmentLoad(
      deptMatch[1],
      teachers,
      departments,
      allocations,
      load,
      max,
    );
  }

  // ── 7: Compare two teachers ─────────────────────────────────────────────────
  const compareMatch = raw.match(
    /compare (.+?) (?:and|vs\.?|with) (.+?)(?:\?|$)/i,
  );
  if (compareMatch) {
    const t1 = matchName(compareMatch[1], teachers);
    const t2 = matchName(compareMatch[2], teachers);
    if (!t1) return notFound("teacher", compareMatch[1]);
    if (!t2) return notFound("teacher", compareMatch[2]);
    return buildCompare(t1, t2, allocations, load, max);
  }

  // ── 8: Grade completion ─────────────────────────────────────────────────────
  const gradeCompMatch = raw.match(
    /how (?:complete|full|done|allocated) is (.+?)(?:\?|$)|(.+?) (?:completion|progress|status)(?:\?|$)/i,
  );
  if (gradeCompMatch) {
    const gradeName = (gradeCompMatch[1] || gradeCompMatch[2]).trim();
    const grade = matchName(gradeName, grades);
    if (grade) return buildGradeCompletion(grade, subjects, allocations);
  }

  // ── Teacher info ─────────────────────────────────────────────────────────────
  const infoPatterns = [
    /what does (.+?) teach/i,
    /show (.+?)(?:'s)? (?:load|allocations|assignments)/i,
    /(.+?)(?:'s)? workload/i,
    /^(?:load|info|details)(?: for| of)? (.+)/i,
  ];
  for (const pat of infoPatterns) {
    const m = raw.match(pat);
    if (m) {
      const teacher = matchName(m[1], teachers);
      if (!teacher) return notFound("teacher", m[1]);
      return buildTeacherInfo(teacher, allocations, load, max);
    }
  }

  // ── Who teaches subject in grade ─────────────────────────────────────────────
  const whoTeachesMatch = raw.match(
    /who (?:teaches?|is teaching) (.+?) in (.+)/i,
  );
  if (whoTeachesMatch) {
    const subject = matchName(whoTeachesMatch[1], subjects);
    const grade = matchName(whoTeachesMatch[2], grades);
    if (!subject) return notFound("subject", whoTeachesMatch[1]);
    if (!grade) return notFound("grade", whoTeachesMatch[2]);
    return buildCellInfo(grade, subject, allocations, teachers, load, max);
  }

  // ── Replace in a specific cell ───────────────────────────────────────────────
  const replaceSpecific = raw.match(
    /replace (.+?) with (.+?) in (.+?) (?:for|in|–|-) (.+)/i,
  );
  if (replaceSpecific) {
    const from = matchName(replaceSpecific[1], teachers);
    const to = matchName(replaceSpecific[2], teachers);
    const grade = matchName(replaceSpecific[3], grades);
    const subject = matchName(replaceSpecific[4], subjects);
    if (!from) return notFound("teacher", replaceSpecific[1]);
    if (!to) return notFound("teacher", replaceSpecific[2]);
    if (!grade) return notFound("grade", replaceSpecific[3]);
    if (!subject) return notFound("subject", replaceSpecific[4]);
    return buildReplaceCell(from, to, grade, subject, allocations, load, max);
  }

  // ── Replace teacher globally ─────────────────────────────────────────────────
  const replaceGlobal = raw.match(
    /(?:replace|swap|substitute) (.+?) with (.+?)(?:\?|$)/i,
  );
  if (replaceGlobal) {
    const from = matchName(replaceGlobal[1], teachers);
    const to = matchName(replaceGlobal[2], teachers);
    if (!from) return notFound("teacher", replaceGlobal[1]);
    if (!to) return notFound("teacher", replaceGlobal[2]);
    return buildReplaceGlobal(
      from,
      to,
      allocations,
      subjects,
      grades,
      load,
      max,
    );
  }

  // ── Can take over ─────────────────────────────────────────────────────────────
  const canTakeOver = raw.match(
    /can (.+?) (?:take over|cover|replace) (?:from |for )?(.+?)(?:\?|$)/i,
  );
  if (canTakeOver) {
    const to = matchName(canTakeOver[1], teachers);
    const from = matchName(canTakeOver[2], teachers);
    if (!to) return notFound("teacher", canTakeOver[1]);
    if (!from) return notFound("teacher", canTakeOver[2]);
    return buildReplaceGlobal(
      from,
      to,
      allocations,
      subjects,
      grades,
      load,
      max,
    );
  }

  // ── Remove / what if leaves ───────────────────────────────────────────────────
  const removeMatch = raw.match(
    /(?:remove|what if|if) (.+?) (?:leaves?|is removed|is unavailable|resigns?)/i,
  );
  if (removeMatch) {
    const teacher = matchName(removeMatch[1], teachers);
    if (!teacher) return notFound("teacher", removeMatch[1]);
    return buildRemove(teacher, allocations, subjects, grades, load);
  }

  // ── No match ──────────────────────────────────────────────────────────────────
  return { type: "help" };
};

// ─── Shared error helper ──────────────────────────────────────────────────────
const notFound = (kind, name) => ({
  type: "error",
  message: `I couldn't find a ${kind} matching "${name}". Check the spelling or try a partial name.`,
});

// ─── Builder functions ────────────────────────────────────────────────────────
// Each returns a plain result object consumed by the matching renderer.

const buildTeacherInfo = (teacher, allocations, load, max) => ({
  type: "info",
  teacher,
  load: load(teacher.id),
  max: max(teacher),
  pct: Math.round((load(teacher.id) / max(teacher)) * 100),
  allocations: allocations.filter((a) => a.teacherId === teacher.id),
});

const buildCellInfo = (grade, subject, allocations, teachers, load, max) => {
  const cellAllocs = allocations.filter(
    (a) => a.gradeId === grade.id && a.subjectId === subject.id,
  );
  if (cellAllocs.length === 0) {
    return {
      type: "empty_cell",
      message: `No teacher is currently assigned to **${subject.name}** in **${grade.name}**.`,
    };
  }
  return {
    type: "cell_info",
    grade,
    subject,
    allocations: cellAllocs.map((a) => {
      const t = teachers.find((t) => t.id === a.teacherId);
      return { ...a, load: load(a.teacherId), max: max(t) };
    }),
  };
};

const buildReplaceCell = (from, to, grade, subject, allocations, load, max) => {
  const cellAlloc = allocations.find(
    (a) =>
      a.teacherId === from.id &&
      a.gradeId === grade.id &&
      a.subjectId === subject.id,
  );
  if (!cellAlloc) {
    return {
      type: "error",
      message: `**${from.name}** is not assigned to **${subject.name}** in **${grade.name}**.`,
    };
  }
  const periodsNeeded = parseInt(cellAlloc.periodsPerWeek) || 0;
  const toCurrentLoad = load(to.id);
  const toMax = max(to);
  const toNewLoad = toCurrentLoad + periodsNeeded;
  return {
    type: "replace_cell",
    from,
    to,
    grade,
    subject,
    periodsNeeded,
    isQualified: !!to.subjectIds?.includes(subject.id),
    fromNewLoad: load(from.id) - periodsNeeded,
    toCurrentLoad,
    toNewLoad,
    toMax,
    overCapacity: toNewLoad > toMax,
  };
};

const buildReplaceGlobal = (
  from,
  to,
  allocations,
  subjects,
  grades,
  load,
  max,
) => {
  const fromAllocs = allocations.filter((a) => a.teacherId === from.id);
  if (fromAllocs.length === 0) {
    return {
      type: "error",
      message: `**${from.name}** has no current allocations to replace.`,
    };
  }
  const totalPeriods = fromAllocs.reduce(
    (s, a) => s + (parseInt(a.periodsPerWeek) || 0),
    0,
  );
  const toCurrentLoad = load(to.id);
  const toMax = max(to);
  const toNewLoad = toCurrentLoad + totalPeriods;
  const overCapacity = toNewLoad > toMax;
  const cellDetails = fromAllocs.map((a) => ({
    ...a,
    subject: subjects.find((s) => s.id === a.subjectId),
    grade: grades.find((g) => g.id === a.gradeId),
    qualified: !!to.subjectIds?.includes(a.subjectId),
    periods: parseInt(a.periodsPerWeek) || 0,
  }));
  return {
    type: "replace_global",
    from,
    to,
    totalPeriods,
    toCurrentLoad,
    toNewLoad,
    toMax,
    overCapacity,
    shortage: overCapacity ? toNewLoad - toMax : 0,
    cellDetails,
    unqualified: cellDetails.filter((c) => !c.qualified),
    fromNewLoad: load(from.id) - totalPeriods,
  };
};

const buildRemove = (teacher, allocations, subjects, grades, load) => {
  const myAllocs = allocations.filter((a) => a.teacherId === teacher.id);
  if (myAllocs.length === 0) {
    return {
      type: "error",
      message: `**${teacher.name}** has no allocations. Removing them has no impact.`,
    };
  }
  return {
    type: "remove",
    teacher,
    totalPeriods: myAllocs.reduce(
      (s, a) => s + (parseInt(a.periodsPerWeek) || 0),
      0,
    ),
    cellDetails: myAllocs.map((a) => ({
      ...a,
      subject: subjects.find((s) => s.id === a.subjectId),
      grade: grades.find((g) => g.id === a.gradeId),
      periods: parseInt(a.periodsPerWeek) || 0,
    })),
  };
};

const buildOverloaded = (teachers, load, max) => ({
  type: "overloaded",
  list: teachers
    .map((t) => ({
      ...t,
      load: load(t.id),
      max: max(t),
      pct: Math.round((load(t.id) / max(t)) * 100),
    }))
    .filter((t) => t.pct > 90)
    .sort((a, b) => b.pct - a.pct),
});

const buildUnderutilised = (teachers, load, max) => ({
  type: "underutilised",
  list: teachers
    .map((t) => {
      const l = load(t.id);
      const m = max(t);
      return {
        ...t,
        load: l,
        max: m,
        pct: Math.round((l / m) * 100),
        available: m - l,
      };
    })
    .filter((t) => t.pct < 50)
    .sort((a, b) => a.pct - b.pct),
});

const buildGaps = (grades, subjects, allocations) => {
  const gaps = [];
  grades.forEach((grade) => {
    subjects.forEach((subject) => {
      if (!subject.gradeIds?.includes(grade.id)) return;
      const detail = subject.gradeDetails?.find((g) => g.id === grade.id);
      const required = parseInt(detail?.periods) || 0;
      if (!required) return;
      const allocated = allocations
        .filter((a) => a.gradeId === grade.id && a.subjectId === subject.id)
        .reduce((s, a) => s + (parseInt(a.periodsPerWeek) || 0), 0);
      const remaining = required - allocated;
      if (remaining > 0)
        gaps.push({ grade, subject, required, allocated, remaining });
    });
  });
  return { type: "gaps", gaps };
};

const buildSubjectCoverage = (subject, grades, allocations) => {
  const rows = grades
    .filter((g) => subject.gradeIds?.includes(g.id))
    .map((grade) => {
      const detail = subject.gradeDetails?.find((g) => g.id === grade.id);
      const required = parseInt(detail?.periods) || 0;
      const allocated = allocations
        .filter((a) => a.gradeId === grade.id && a.subjectId === subject.id)
        .reduce((s, a) => s + (parseInt(a.periodsPerWeek) || 0), 0);
      const status =
        allocated === 0 ? "empty" : allocated < required ? "partial" : "full";
      return {
        grade,
        required,
        allocated,
        remaining: required - allocated,
        status,
      };
    });
  const totalRequired = rows.reduce((s, r) => s + r.required, 0);
  const totalAllocated = rows.reduce((s, r) => s + r.allocated, 0);
  return {
    type: "subject_coverage",
    subject,
    rows,
    totalRequired,
    totalAllocated,
    overallPct:
      totalRequired > 0
        ? Math.round((totalAllocated / totalRequired) * 100)
        : 0,
  };
};

const buildFindSubstitute = (
  teacher,
  grade,
  subject,
  teachers,
  allocations,
  load,
  max,
) => {
  const cellAlloc = allocations.find(
    (a) =>
      a.teacherId === teacher.id &&
      a.gradeId === grade.id &&
      a.subjectId === subject.id,
  );
  const periodsNeeded = cellAlloc ? parseInt(cellAlloc.periodsPerWeek) || 0 : 0;
  const candidates = teachers
    .filter((t) => t.id !== teacher.id && t.subjectIds?.includes(subject.id))
    .map((t) => {
      const l = load(t.id);
      const m = max(t);
      const available = m - l;
      return {
        ...t,
        load: l,
        max: m,
        available,
        pct: Math.round((l / m) * 100),
        canCover: available >= periodsNeeded,
      };
    })
    .filter((t) => t.available > 0)
    .sort((a, b) => b.available - a.available);
  return {
    type: "find_substitute",
    teacher,
    grade,
    subject,
    periodsNeeded,
    candidates,
  };
};

const buildDepartmentLoad = (
  deptQuery,
  teachers,
  departments,
  allocations,
  load,
  max,
) => {
  const q = deptQuery.toLowerCase().trim();

  // Step 1: Find the matching department from the departments collection
  const matchedDept = departments.find((d) =>
    d.name?.toLowerCase().includes(q),
  );

  if (!matchedDept) {
    return {
      type: "error",
      message: `No department found matching "${deptQuery}". Try the exact department name.`,
    };
  }

  // Step 2: Find teachers who belong to this department via departmentIds array
  const deptTeachers = teachers.filter(
    (t) =>
      Array.isArray(t.departmentIds) &&
      t.departmentIds.includes(matchedDept.id),
  );

  if (deptTeachers.length === 0) {
    return {
      type: "error",
      message: `Department "${matchedDept.name}" exists but has no teachers assigned to it.`,
    };
  }

  const list = deptTeachers
    .map((t) => {
      const l = load(t.id);
      const m = max(t);
      return { ...t, load: l, max: m, pct: Math.round((l / m) * 100) };
    })
    .sort((a, b) => b.pct - a.pct);

  const totalLoad = list.reduce((s, t) => s + t.load, 0);
  const totalMax = list.reduce((s, t) => s + t.max, 0);

  return {
    type: "department_load",
    deptName: matchedDept.name,
    list,
    totalLoad,
    totalMax,
    avgPct: totalMax > 0 ? Math.round((totalLoad / totalMax) * 100) : 0,
  };
};

const buildCompare = (t1, t2, allocations, load, max) => {
  const enrich = (t) => {
    const l = load(t.id);
    const m = max(t);
    const myAllocs = allocations.filter((a) => a.teacherId === t.id);
    return {
      ...t,
      load: l,
      max: m,
      pct: Math.round((l / m) * 100),
      available: m - l,
      gradeCount: new Set(myAllocs.map((a) => a.gradeId)).size,
      subjectCount: new Set(myAllocs.map((a) => a.subjectId)).size,
    };
  };
  return { type: "compare", t1: enrich(t1), t2: enrich(t2) };
};

const buildGradeCompletion = (grade, subjects, allocations) => {
  const rows = subjects
    .filter((s) => s.gradeIds?.includes(grade.id))
    .map((subject) => {
      const detail = subject.gradeDetails?.find((g) => g.id === grade.id);
      const required = parseInt(detail?.periods) || 0;
      const allocated = allocations
        .filter((a) => a.gradeId === grade.id && a.subjectId === subject.id)
        .reduce((s, a) => s + (parseInt(a.periodsPerWeek) || 0), 0);
      const status =
        allocated === 0 ? "empty" : allocated < required ? "partial" : "full";
      return {
        subject,
        required,
        allocated,
        remaining: required - allocated,
        status,
      };
    })
    .filter((r) => r.required > 0);
  const totalRequired = rows.reduce((s, r) => s + r.required, 0);
  const totalAllocated = rows.reduce((s, r) => s + r.allocated, 0);
  return {
    type: "grade_completion",
    grade,
    rows,
    totalRequired,
    totalAllocated,
    pct:
      totalRequired > 0
        ? Math.round((totalAllocated / totalRequired) * 100)
        : 0,
  };
};
