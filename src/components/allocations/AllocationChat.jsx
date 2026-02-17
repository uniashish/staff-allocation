import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  ArrowRightLeft,
  User,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// ─── Fuzzy name matcher ────────────────────────────────────────────────────────
const matchName = (query, list) => {
  const q = query.toLowerCase().trim();
  let found = list.find((item) => item.name.toLowerCase() === q);
  if (found) return found;
  found = list.find((item) => item.name.toLowerCase().startsWith(q));
  if (found) return found;
  const words = q.split(/\s+/);
  found = list.find((item) =>
    words.some((w) => w.length > 2 && item.name.toLowerCase().includes(w)),
  );
  return found || null;
};

// ─── Core Analysis Engine ─────────────────────────────────────────────────────
const analyzeQuery = (input, { grades, subjects, teachers, allocations }) => {
  const raw = input.trim();

  const getLoad = (teacherId) =>
    allocations
      .filter((a) => a.teacherId === teacherId)
      .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

  const getMax = (teacher) => parseInt(teacher?.maxLoad) || 30;

  // ── 1: Overloaded teachers ──
  if (
    /who is overload|overwork|over capacity|over 90|above (90|max)|most loaded|busiest/i.test(
      raw,
    )
  ) {
    return overloadedTeachers(teachers, getLoad, getMax);
  }

  // ── 2: Underutilised teachers ──
  if (
    /who has free|underutil|free period|can take more|least loaded|available teacher|who is free|light load/i.test(
      raw,
    )
  ) {
    return underutilisedTeachers(teachers, getLoad, getMax);
  }

  // ── 3: Gaps / unallocated cells ──
  if (
    /unassign|unalloc|what.*gap|show gap|missing assign|not.*cover|incomplete cell/i.test(
      raw,
    )
  ) {
    return unallocatedCells(grades, subjects, allocations);
  }

  // ── 4: Subject coverage ──
  const coverageMatch = raw.match(
    /(?:is |coverage for |how.*covered? is |check coverage.*?for )?(.+?) (?:fully covered|coverage|covered\?|complete\?)/i,
  );
  if (coverageMatch) {
    const subject = matchName(coverageMatch[1], subjects);
    if (subject) return subjectCoverage(subject, grades, allocations);
  }

  // ── 5: Find substitute ──
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
    return findSubstitute(
      teacher,
      grade,
      subject,
      teachers,
      allocations,
      getLoad,
      getMax,
    );
  }

  // ── 6: Department load ──
  const deptMatch = raw.match(
    /(?:show |department |dept )?(.+?) (?:department|dept) (?:load|summary|workload)/i,
  );
  if (deptMatch) {
    return departmentLoad(deptMatch[1], teachers, allocations, getLoad, getMax);
  }

  // ── 7: Compare two teachers ──
  const compareMatch = raw.match(
    /compare (.+?) (?:and|vs\.?|with) (.+?)(?:\?|$)/i,
  );
  if (compareMatch) {
    const t1 = matchName(compareMatch[1], teachers);
    const t2 = matchName(compareMatch[2], teachers);
    if (!t1) return notFound("teacher", compareMatch[1]);
    if (!t2) return notFound("teacher", compareMatch[2]);
    return compareTeachers(t1, t2, allocations, getLoad, getMax);
  }

  // ── 8: Grade completion ──
  const gradeCompMatch = raw.match(
    /how (?:complete|full|done|allocated) is (.+?)(?:\?|$)|(.+?) (?:completion|progress|status)(?:\?|$)/i,
  );
  if (gradeCompMatch) {
    const gradeName = gradeCompMatch[1] || gradeCompMatch[2];
    const grade = matchName(gradeName.trim(), grades);
    if (grade) return gradeCompletion(grade, subjects, allocations);
  }

  // ── Teacher info ──
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
      return teacherInfo(teacher, allocations, getLoad, getMax);
    }
  }

  // ── Who teaches subject in grade ──
  const whoTeachesMatch = raw.match(
    /who (?:teaches?|is teaching) (.+?) in (.+)/i,
  );
  if (whoTeachesMatch) {
    const subject = matchName(whoTeachesMatch[1], subjects);
    const grade = matchName(whoTeachesMatch[2], grades);
    if (!subject) return notFound("subject", whoTeachesMatch[1]);
    if (!grade) return notFound("grade", whoTeachesMatch[2]);
    return whoTeaches(grade, subject, allocations, teachers, getLoad, getMax);
  }

  // ── Replace in specific cell ──
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
    return replaceInCell(
      from,
      to,
      grade,
      subject,
      allocations,
      getLoad,
      getMax,
    );
  }

  // ── Replace global ──
  const replaceGlobal = raw.match(
    /(?:replace|swap|substitute) (.+?) with (.+?)(?:\?|$)/i,
  );
  if (replaceGlobal) {
    const from = matchName(replaceGlobal[1], teachers);
    const to = matchName(replaceGlobal[2], teachers);
    if (!from) return notFound("teacher", replaceGlobal[1]);
    if (!to) return notFound("teacher", replaceGlobal[2]);
    return replaceGlobalAnalysis(
      from,
      to,
      allocations,
      subjects,
      grades,
      getLoad,
      getMax,
    );
  }

  // ── Can take over ──
  const canTakeOver = raw.match(
    /can (.+?) (?:take over|cover|replace) (?:from |for )?(.+?)(?:\?|$)/i,
  );
  if (canTakeOver) {
    const to = matchName(canTakeOver[1], teachers);
    const from = matchName(canTakeOver[2], teachers);
    if (!to) return notFound("teacher", canTakeOver[1]);
    if (!from) return notFound("teacher", canTakeOver[2]);
    return replaceGlobalAnalysis(
      from,
      to,
      allocations,
      subjects,
      grades,
      getLoad,
      getMax,
    );
  }

  // ── Remove / what if leaves ──
  const removeMatch = raw.match(
    /(?:remove|what if|if) (.+?) (?:leaves?|is removed|is unavailable|resigns?)/i,
  );
  if (removeMatch) {
    const teacher = matchName(removeMatch[1], teachers);
    if (!teacher) return notFound("teacher", removeMatch[1]);
    return removeTeacher(
      teacher,
      allocations,
      subjects,
      grades,
      getLoad,
      getMax,
    );
  }

  return { type: "help" };
};

// ─── Analysis Functions ───────────────────────────────────────────────────────

const notFound = (kind, name) => ({
  type: "error",
  message: `I couldn't find a ${kind} matching "${name}". Check the spelling or try a partial name.`,
});

const teacherInfo = (teacher, allocations, getLoad, getMax) => {
  const myAllocs = allocations.filter((a) => a.teacherId === teacher.id);
  const load = getLoad(teacher.id);
  const max = getMax(teacher);
  const pct = Math.round((load / max) * 100);
  return { type: "info", teacher, load, max, pct, allocations: myAllocs };
};

const whoTeaches = (grade, subject, allocations, teachers, getLoad, getMax) => {
  const cellAllocs = allocations.filter(
    (a) => a.gradeId === grade.id && a.subjectId === subject.id,
  );
  if (cellAllocs.length === 0)
    return {
      type: "empty_cell",
      message: `No teacher is currently assigned to **${subject.name}** in **${grade.name}**.`,
    };
  const enriched = cellAllocs.map((a) => {
    const t = teachers.find((t) => t.id === a.teacherId);
    return { ...a, load: getLoad(a.teacherId), max: getMax(t) };
  });
  return { type: "cell_info", grade, subject, allocations: enriched };
};

const replaceInCell = (
  from,
  to,
  grade,
  subject,
  allocations,
  getLoad,
  getMax,
) => {
  const cellAlloc = allocations.find(
    (a) =>
      a.teacherId === from.id &&
      a.gradeId === grade.id &&
      a.subjectId === subject.id,
  );
  if (!cellAlloc)
    return {
      type: "error",
      message: `**${from.name}** is not assigned to **${subject.name}** in **${grade.name}**.`,
    };
  const periodsNeeded = parseInt(cellAlloc.periodsPerWeek) || 0;
  const isQualified = to.subjectIds?.includes(subject.id);
  const toCurrentLoad = getLoad(to.id);
  const toMax = getMax(to);
  const toNewLoad = toCurrentLoad + periodsNeeded;
  const fromNewLoad = getLoad(from.id) - periodsNeeded;
  return {
    type: "replace_cell",
    from,
    to,
    grade,
    subject,
    periodsNeeded,
    isQualified,
    fromNewLoad,
    toCurrentLoad,
    toNewLoad,
    toMax,
    overCapacity: toNewLoad > toMax,
  };
};

const replaceGlobalAnalysis = (
  from,
  to,
  allocations,
  subjects,
  grades,
  getLoad,
  getMax,
) => {
  const fromAllocs = allocations.filter((a) => a.teacherId === from.id);
  if (fromAllocs.length === 0)
    return {
      type: "error",
      message: `**${from.name}** has no current allocations to replace.`,
    };
  const totalPeriods = fromAllocs.reduce(
    (s, a) => s + (parseInt(a.periodsPerWeek) || 0),
    0,
  );
  const toCurrentLoad = getLoad(to.id);
  const toMax = getMax(to);
  const toNewLoad = toCurrentLoad + totalPeriods;
  const overCapacity = toNewLoad > toMax;
  const cellDetails = fromAllocs.map((a) => ({
    ...a,
    subject: subjects.find((s) => s.id === a.subjectId),
    grade: grades.find((g) => g.id === a.gradeId),
    qualified: to.subjectIds?.includes(a.subjectId),
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
    fromNewLoad: getLoad(from.id) - totalPeriods,
  };
};

const removeTeacher = (
  teacher,
  allocations,
  subjects,
  grades,
  getLoad,
  getMax,
) => {
  const myAllocs = allocations.filter((a) => a.teacherId === teacher.id);
  if (myAllocs.length === 0)
    return {
      type: "error",
      message: `**${teacher.name}** has no allocations. Removing them has no impact.`,
    };
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

const overloadedTeachers = (teachers, getLoad, getMax) => ({
  type: "overloaded",
  list: teachers
    .map((t) => ({
      ...t,
      load: getLoad(t.id),
      max: getMax(t),
      pct: Math.round((getLoad(t.id) / getMax(t)) * 100),
    }))
    .filter((t) => t.pct > 90)
    .sort((a, b) => b.pct - a.pct),
});

const underutilisedTeachers = (teachers, getLoad, getMax) => ({
  type: "underutilised",
  list: teachers
    .map((t) => {
      const load = getLoad(t.id);
      const max = getMax(t);
      return {
        ...t,
        load,
        max,
        pct: Math.round((load / max) * 100),
        available: max - load,
      };
    })
    .filter((t) => t.pct < 50)
    .sort((a, b) => a.pct - b.pct),
});

const unallocatedCells = (grades, subjects, allocations) => {
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

const subjectCoverage = (subject, grades, allocations) => {
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

const findSubstitute = (
  teacher,
  grade,
  subject,
  teachers,
  allocations,
  getLoad,
  getMax,
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
      const load = getLoad(t.id);
      const max = getMax(t);
      const available = max - load;
      return {
        ...t,
        load,
        max,
        available,
        pct: Math.round((load / max) * 100),
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

const departmentLoad = (deptQuery, teachers, allocations, getLoad, getMax) => {
  const q = deptQuery.toLowerCase().trim();
  const deptTeachers = teachers.filter(
    (t) =>
      t.departmentName?.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q),
  );
  if (deptTeachers.length === 0)
    return {
      type: "error",
      message: `No teachers found in a department matching "${deptQuery}".`,
    };
  const list = deptTeachers
    .map((t) => {
      const load = getLoad(t.id);
      const max = getMax(t);
      return { ...t, load, max, pct: Math.round((load / max) * 100) };
    })
    .sort((a, b) => b.pct - a.pct);
  const totalLoad = list.reduce((s, t) => s + t.load, 0);
  const totalMax = list.reduce((s, t) => s + t.max, 0);
  return {
    type: "department_load",
    deptName:
      deptTeachers[0]?.departmentName ||
      deptTeachers[0]?.department ||
      deptQuery,
    list,
    totalLoad,
    totalMax,
    avgPct: totalMax > 0 ? Math.round((totalLoad / totalMax) * 100) : 0,
  };
};

const compareTeachers = (t1, t2, allocations, getLoad, getMax) => {
  const enrich = (t) => {
    const load = getLoad(t.id);
    const max = getMax(t);
    const myAllocs = allocations.filter((a) => a.teacherId === t.id);
    return {
      ...t,
      load,
      max,
      pct: Math.round((load / max) * 100),
      available: max - load,
      gradeCount: new Set(myAllocs.map((a) => a.gradeId)).size,
      subjectCount: new Set(myAllocs.map((a) => a.subjectId)).size,
    };
  };
  return { type: "compare", t1: enrich(t1), t2: enrich(t2) };
};

const gradeCompletion = (grade, subjects, allocations) => {
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

// ─── Shared UI Helpers ────────────────────────────────────────────────────────

const PctBar = ({ current, max, showLabel = true }) => {
  const pct = Math.min(100, Math.round((current / (max || 30)) * 100));
  const color =
    pct > 90 ? "bg-red-400" : pct > 70 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] font-mono opacity-70 whitespace-nowrap">
          {current}/{max}
        </span>
      )}
    </div>
  );
};

const Badge = ({ pct }) => (
  <span
    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${
      pct > 90
        ? "bg-red-400/30 text-red-200"
        : pct > 70
          ? "bg-amber-400/30 text-amber-200"
          : "bg-emerald-400/30 text-emerald-200"
    }`}
  >
    {pct}%
  </span>
);

const StatusDot = ({ status }) => {
  const map = {
    full: "bg-emerald-400",
    partial: "bg-amber-400",
    empty: "bg-red-400",
  };
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 ${map[status] || "bg-gray-400"}`}
    />
  );
};

// ─── Result Renderer ──────────────────────────────────────────────────────────
const ResultMessage = ({ result }) => {
  if (!result) return null;

  if (result.type === "help") {
    return (
      <div>
        <p className="text-xs opacity-80 mb-2">Try asking things like:</p>
        <div className="flex flex-col gap-1.5">
          {[
            "replace Ahmed with Sara",
            "who is overloaded?",
            "who has free periods?",
            "show gaps",
            "is Math fully covered?",
            "who can cover Ahmed in Grade 5 for Math?",
            "Science department load",
            "compare Ahmed and Sara",
            "how complete is Grade 7?",
            "what does Sara teach?",
            "what if Ahmed leaves?",
          ].map((s, i) => (
            <div
              key={i}
              className="text-[11px] bg-white/10 rounded-lg px-2.5 py-1.5 font-mono flex items-center gap-1.5"
            >
              <ChevronRight size={9} className="opacity-40 shrink-0" />
              {s}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (result.type === "error") {
    return (
      <div className="flex items-start gap-2">
        <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
        <p
          className="text-xs leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: result.message.replace(
              /\*\*(.+?)\*\*/g,
              "<strong>$1</strong>",
            ),
          }}
        />
      </div>
    );
  }

  if (result.type === "info") {
    const { teacher, load, max, pct, allocations: allocs } = result;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <User size={11} />
          </div>
          <span className="text-sm font-bold">{teacher.name}</span>
          <Badge pct={pct} />
        </div>
        <PctBar current={load} max={max} />
        {allocs.length > 0 ? (
          <div className="mt-2 space-y-1">
            {allocs.map((a) => (
              <div
                key={a.id}
                className="flex justify-between text-[10px] bg-white/10 rounded px-2 py-1"
              >
                <span className="opacity-80">
                  {a.gradeName} · {a.subjectName}
                </span>
                <span className="font-mono font-bold">{a.periodsPerWeek}p</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs opacity-60 mt-2">No allocations found.</p>
        )}
      </div>
    );
  }

  if (result.type === "cell_info") {
    const { grade, subject, allocations: allocs } = result;
    return (
      <div>
        <p className="text-xs font-bold mb-2">
          {subject.name} in {grade.name}
        </p>
        {allocs.map((a) => (
          <div key={a.id} className="mb-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold">{a.teacherName}</span>
              <span className="font-mono opacity-70">
                {a.periodsPerWeek}p/wk
              </span>
            </div>
            <PctBar current={a.load} max={a.max} />
          </div>
        ))}
      </div>
    );
  }

  if (result.type === "empty_cell") {
    return (
      <div className="flex items-start gap-2">
        <Info size={13} className="text-blue-300 mt-0.5 shrink-0" />
        <p
          className="text-xs leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: result.message.replace(
              /\*\*(.+?)\*\*/g,
              "<strong>$1</strong>",
            ),
          }}
        />
      </div>
    );
  }

  if (result.type === "replace_cell") {
    const {
      from,
      to,
      grade,
      subject,
      periodsNeeded,
      isQualified,
      fromNewLoad,
      toNewLoad,
      toMax,
      overCapacity,
    } = result;
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-3 text-xs">
          <span className="font-bold">{from.name}</span>
          <ArrowRightLeft size={10} className="opacity-50" />
          <span className="font-bold">{to.name}</span>
          <span className="opacity-40 text-[10px]">
            {grade.name} · {subject.name}
          </span>
        </div>
        <div
          className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-1.5 ${isQualified ? "bg-emerald-500/20" : "bg-red-500/20"}`}
        >
          {isQualified ? (
            <CheckCircle2 size={11} className="text-emerald-400" />
          ) : (
            <AlertTriangle size={11} className="text-red-400" />
          )}
          {isQualified
            ? `${to.name} is qualified`
            : `${to.name} NOT qualified for ${subject.name}`}
        </div>
        <div
          className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-1.5 ${overCapacity ? "bg-red-500/20" : "bg-emerald-500/20"}`}
        >
          {overCapacity ? (
            <AlertTriangle size={11} className="text-red-400" />
          ) : (
            <CheckCircle2 size={11} className="text-emerald-400" />
          )}
          {to.name}: {toNewLoad}/{toMax}{" "}
          {overCapacity
            ? `— OVER by ${toNewLoad - toMax}p`
            : "— within capacity"}
        </div>
        <p className="text-[10px] opacity-50 mt-1">
          {periodsNeeded}p transferred · {from.name} freed → {fromNewLoad}p
        </p>
      </div>
    );
  }

  if (result.type === "replace_global") {
    const {
      from,
      to,
      totalPeriods,
      toNewLoad,
      toMax,
      overCapacity,
      shortage,
      cellDetails,
      unqualified,
      fromNewLoad,
    } = result;
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-3 text-xs">
          <span className="font-bold">{from.name}</span>
          <ArrowRightLeft size={10} className="opacity-50" />
          <span className="font-bold">{to.name}</span>
          <span className="opacity-40 text-[10px]">
            ({cellDetails.length} cells)
          </span>
        </div>
        <p className="text-[10px] opacity-50 mb-1">{to.name}'s load after:</p>
        <PctBar current={toNewLoad} max={toMax} />
        {overCapacity && (
          <div className="flex items-center gap-2 text-xs bg-red-500/20 rounded-lg px-3 py-2 mt-2">
            <AlertTriangle size={11} className="text-red-400 shrink-0" />
            Over capacity by <strong className="mx-1">{shortage}p</strong>
          </div>
        )}
        {unqualified.length > 0 && (
          <div className="flex items-start gap-2 text-xs bg-amber-500/20 rounded-lg px-3 py-2 mt-1.5">
            <AlertTriangle
              size={11}
              className="text-amber-400 mt-0.5 shrink-0"
            />
            <div>
              <span className="font-semibold">Not qualified for:</span>
              {unqualified.map((c) => (
                <div key={c.id} className="opacity-80 text-[10px] mt-0.5">
                  {c.grade?.name} · {c.subject?.name} ({c.periods}p)
                </div>
              ))}
            </div>
          </div>
        )}
        {!overCapacity && unqualified.length === 0 && (
          <div className="flex items-center gap-2 text-xs bg-emerald-500/20 rounded-lg px-3 py-2 mt-2">
            <CheckCircle2 size={11} className="text-emerald-400" />
            Fully feasible — qualified and within capacity.
          </div>
        )}
        <div className="mt-2 space-y-1">
          {cellDetails.map((c) => (
            <div
              key={c.id}
              className="flex justify-between items-center text-[10px] bg-white/10 rounded px-2 py-1"
            >
              <span className="opacity-80">
                {c.grade?.name} · {c.subject?.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono">{c.periods}p</span>
                {c.qualified ? (
                  <CheckCircle2 size={9} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={9} className="text-amber-400" />
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] opacity-40 mt-2">
          {from.name} freed → {fromNewLoad}p
        </p>
      </div>
    );
  }

  if (result.type === "remove") {
    const { teacher, totalPeriods, cellDetails } = result;
    return (
      <div>
        <div className="flex items-center gap-2 text-xs bg-red-500/20 rounded-lg px-3 py-2 mb-2">
          <AlertTriangle size={11} className="text-red-400 shrink-0" />
          <span>
            Removing <strong>{teacher.name}</strong> leaves{" "}
            <strong>{totalPeriods}p</strong> unallocated across{" "}
            {cellDetails.length} cell{cellDetails.length !== 1 ? "s" : ""}.
          </span>
        </div>
        <div className="space-y-1">
          {cellDetails.map((c) => (
            <div
              key={c.id}
              className="flex justify-between text-[10px] bg-white/10 rounded px-2 py-1"
            >
              <span className="opacity-80">
                {c.grade?.name} · {c.subject?.name}
              </span>
              <span className="font-mono font-bold text-red-300">
                -{c.periods}p
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] opacity-40 mt-2">
          Use Smart Allocate to fill these gaps.
        </p>
      </div>
    );
  }

  // ── NEW 1: Overloaded ──
  if (result.type === "overloaded") {
    const { list } = result;
    if (list.length === 0)
      return (
        <div className="flex items-center gap-2 text-xs bg-emerald-500/20 rounded-lg px-3 py-2">
          <CheckCircle2 size={11} className="text-emerald-400" />
          No teachers are overloaded. Everyone is under 90% capacity.
        </div>
      );
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={12} className="text-red-400" />
          <p className="text-xs font-bold text-red-300">
            {list.length} overloaded teacher{list.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="space-y-2">
          {list.map((t) => (
            <div key={t.id}>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold">{t.name}</span>
                <Badge pct={t.pct} />
              </div>
              <PctBar current={t.load} max={t.max} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── NEW 2: Underutilised ──
  if (result.type === "underutilised") {
    const { list } = result;
    if (list.length === 0)
      return (
        <div className="flex items-center gap-2 text-xs bg-amber-500/20 rounded-lg px-3 py-2">
          <Info size={11} className="text-amber-400" />
          All teachers are above 50% utilisation.
        </div>
      );
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingDown size={12} className="text-blue-400" />
          <p className="text-xs font-bold text-blue-300">
            {list.length} teacher{list.length !== 1 ? "s" : ""} with room for
            more
          </p>
        </div>
        <div className="space-y-2">
          {list.map((t) => (
            <div key={t.id}>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold">{t.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-emerald-300 font-mono">
                    +{t.available}p free
                  </span>
                  <Badge pct={t.pct} />
                </div>
              </div>
              <PctBar current={t.load} max={t.max} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── NEW 3: Gaps ──
  if (result.type === "gaps") {
    const { gaps } = result;
    if (gaps.length === 0)
      return (
        <div className="flex items-center gap-2 text-xs bg-emerald-500/20 rounded-lg px-3 py-2">
          <CheckCircle2 size={11} className="text-emerald-400" />
          All cells are fully allocated. No gaps found!
        </div>
      );
    const total = gaps.reduce((s, g) => s + g.remaining, 0);
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-red-300">
            {gaps.length} unallocated cell{gaps.length !== 1 ? "s" : ""}
          </p>
          <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-mono">
            {total}p missing
          </span>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {gaps.map((g, i) => (
            <div
              key={i}
              className="flex justify-between items-center text-[10px] bg-white/10 rounded px-2 py-1.5"
            >
              <div>
                <span className="font-semibold opacity-90">{g.grade.name}</span>
                <span className="opacity-50 mx-1">·</span>
                <span className="opacity-80">{g.subject.name}</span>
              </div>
              <div>
                <span className="font-mono text-red-300">-{g.remaining}p</span>
                <span className="opacity-40 ml-1">
                  ({g.allocated}/{g.required})
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] opacity-40 mt-2">
          Use Smart Allocate to fill these gaps.
        </p>
      </div>
    );
  }

  // ── NEW 4: Subject coverage ──
  if (result.type === "subject_coverage") {
    const { subject, rows, totalRequired, totalAllocated, overallPct } = result;
    if (rows.length === 0)
      return (
        <div className="flex items-center gap-2 text-xs bg-amber-500/20 rounded-lg px-3 py-2">
          <Info size={11} className="text-amber-400" />
          {subject.name} is not assigned to any grade.
        </div>
      );
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold">{subject.name} coverage</p>
          <Badge pct={overallPct} />
        </div>
        <PctBar current={totalAllocated} max={totalRequired} />
        <div className="mt-2 space-y-1">
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-[10px] bg-white/10 rounded px-2 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <StatusDot status={r.status} />
                <span className="font-semibold opacity-90">{r.grade.name}</span>
              </div>
              <span className="font-mono opacity-70">
                {r.allocated}/{r.required}p
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-2 text-[10px] opacity-50">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Full
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Partial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Empty
          </span>
        </div>
      </div>
    );
  }

  // ── NEW 5: Find substitute ──
  if (result.type === "find_substitute") {
    const { teacher, grade, subject, periodsNeeded, candidates } = result;
    if (candidates.length === 0)
      return (
        <div className="flex items-start gap-2 text-xs bg-red-500/20 rounded-lg px-3 py-2">
          <AlertTriangle size={11} className="text-red-400 mt-0.5 shrink-0" />
          No qualified teachers with available capacity found for {
            subject.name
          }{" "}
          in {grade.name}.
        </div>
      );
    return (
      <div>
        <p className="text-xs font-bold mb-1">
          Substitutes for {subject.name} in {grade.name}
        </p>
        {periodsNeeded > 0 && (
          <p className="text-[10px] opacity-50 mb-2">
            {periodsNeeded}p/wk needed
          </p>
        )}
        <div className="space-y-2">
          {candidates.slice(0, 5).map((t) => (
            <div key={t.id}>
              <div className="flex justify-between items-center text-xs mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{t.name}</span>
                  {t.canCover && periodsNeeded > 0 && (
                    <CheckCircle2 size={10} className="text-emerald-400" />
                  )}
                </div>
                <span className="text-[10px] text-emerald-300 font-mono">
                  +{t.available}p free
                </span>
              </div>
              <PctBar current={t.load} max={t.max} />
            </div>
          ))}
        </div>
        {candidates.length > 5 && (
          <p className="text-[10px] opacity-40 mt-1">
            +{candidates.length - 5} more available
          </p>
        )}
      </div>
    );
  }

  // ── NEW 6: Department load ──
  if (result.type === "department_load") {
    const { deptName, list, totalLoad, totalMax, avgPct } = result;
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold">{deptName} Dept</p>
          <Badge pct={avgPct} />
        </div>
        <PctBar current={totalLoad} max={totalMax} />
        <p className="text-[10px] opacity-40 mt-1 mb-2">
          {list.length} teachers · {totalLoad}/{totalMax}p total
        </p>
        <div className="space-y-1.5">
          {list.map((t) => (
            <div key={t.id}>
              <div className="flex justify-between items-center text-[10px] mb-0.5">
                <span className="font-semibold opacity-90">{t.name}</span>
                <Badge pct={t.pct} />
              </div>
              <PctBar current={t.load} max={t.max} showLabel={false} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── NEW 7: Compare ──
  if (result.type === "compare") {
    const { t1, t2 } = result;
    const rows = [
      {
        label: "Load",
        v1: `${t1.load}p`,
        v2: `${t2.load}p`,
        better: t1.load < t2.load ? 1 : t2.load < t1.load ? 2 : 0,
      },
      { label: "Max", v1: `${t1.max}p`, v2: `${t2.max}p`, better: 0 },
      {
        label: "Used",
        v1: `${t1.pct}%`,
        v2: `${t2.pct}%`,
        better: t1.pct < t2.pct ? 1 : t2.pct < t1.pct ? 2 : 0,
      },
      {
        label: "Free",
        v1: `${t1.available}p`,
        v2: `${t2.available}p`,
        better:
          t1.available > t2.available ? 1 : t2.available > t1.available ? 2 : 0,
      },
      { label: "Grades", v1: t1.gradeCount, v2: t2.gradeCount, better: 0 },
      {
        label: "Subjects",
        v1: t1.subjectCount,
        v2: t2.subjectCount,
        better: 0,
      },
    ];
    return (
      <div>
        <div className="grid grid-cols-3 text-[10px] font-bold mb-2 text-center">
          <span className="text-left opacity-40">Metric</span>
          <span className="text-indigo-300 truncate">
            {t1.name.split(" ")[0]}
          </span>
          <span className="text-violet-300 truncate">
            {t2.name.split(" ")[0]}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <PctBar current={t1.load} max={t1.max} />
          <PctBar current={t2.load} max={t2.max} />
        </div>
        <div className="space-y-1">
          {rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-3 text-[10px] bg-white/10 rounded px-2 py-1.5 items-center"
            >
              <span className="opacity-50">{r.label}</span>
              <span
                className={`text-center font-mono font-bold ${r.better === 1 ? "text-emerald-300" : ""}`}
              >
                {r.v1}
              </span>
              <span
                className={`text-center font-mono font-bold ${r.better === 2 ? "text-emerald-300" : ""}`}
              >
                {r.v2}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] opacity-30 mt-1.5">Green = better value</p>
      </div>
    );
  }

  // ── NEW 8: Grade completion ──
  if (result.type === "grade_completion") {
    const { grade, rows, totalRequired, totalAllocated, pct } = result;
    const full = rows.filter((r) => r.status === "full").length;
    const partial = rows.filter((r) => r.status === "partial").length;
    const empty = rows.filter((r) => r.status === "empty").length;
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold">{grade.name} completion</p>
          <Badge pct={pct} />
        </div>
        <PctBar current={totalAllocated} max={totalRequired} />
        <div className="flex gap-3 text-[10px] mt-1.5 mb-2">
          <span className="text-emerald-300">{full} full</span>
          <span className="text-amber-300">{partial} partial</span>
          <span className="text-red-300">{empty} empty</span>
        </div>
        <div className="space-y-1 max-h-36 overflow-y-auto">
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-[10px] bg-white/10 rounded px-2 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <StatusDot status={r.status} />
                <span className="opacity-90">{r.subject.name}</span>
              </div>
              <span className="font-mono opacity-70">
                {r.allocated}/{r.required}p
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

// ─── Chat Message ─────────────────────────────────────────────────────────────
const ChatMessage = ({ msg }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
          <Sparkles size={10} className="text-indigo-300" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
          isUser
            ? "bg-indigo-500 text-white rounded-tr-sm"
            : "bg-white/10 text-white rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <p>{msg.text}</p>
        ) : msg.result ? (
          <ResultMessage result={msg.result} />
        ) : (
          <p>{msg.text}</p>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AllocationChat = ({ grades, subjects, teachers, allocations }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 0, role: "assistant", text: null, result: { type: "help" } },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg = { id: Date.now(), role: "user", text };
    const result = analyzeQuery(text, {
      grades,
      subjects,
      teachers,
      allocations,
    });
    const botMsg = {
      id: Date.now() + 1,
      role: "assistant",
      text: null,
      result,
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center group"
          title="Allocation Assistant"
        >
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-indigo-500 opacity-30 animate-ping" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-xl shadow-indigo-900/40 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageSquare size={20} className="text-white" />
            </div>
          </div>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-indigo-900/40"
          style={{ height: "500px" }}
        >
          <div className="bg-gradient-to-r from-indigo-700 to-violet-700 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">
                  Allocation Assistant
                </p>
                <p className="text-[10px] text-indigo-200 mt-0.5">
                  Ask about teachers & allocations
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-3 py-3"
            style={{
              background:
                "linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
            }}
          >
            {messages.map((msg) => (
              <ChatMessage key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          <div
            className="px-3 py-3 shrink-0 border-t border-white/10"
            style={{ background: "#1e1b4b" }}
          >
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about allocations…"
                className="flex-1 bg-transparent text-white text-xs placeholder-white/30 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-6 h-6 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                <Send size={11} className="text-white" />
              </button>
            </div>
            <p className="text-[9px] text-white/20 text-center mt-1.5">
              Press Enter to send
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AllocationChat;
