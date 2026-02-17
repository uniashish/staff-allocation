import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import { loadStatus, statusColors } from "./shadowEngine";

// ─── Constants ────────────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { value: "all", label: "All Cells" },
  { value: "changed", label: "Changed Only" },
  { value: "problem", label: "Problems Only" },
];

// ─── Small reusable load bar ──────────────────────────────────────────────────
const LoadBar = ({ load, max }) => {
  const pct = Math.min(100, Math.round((load / (max || 30)) * 100));
  const status = loadStatus(load, max);
  const color = statusColors[status].bar;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] font-mono text-gray-500 whitespace-nowrap">
        {load}/{max}
      </span>
    </div>
  );
};

// ─── Teacher chip shown inside a cell ────────────────────────────────────────
// mode: "real" | "shadow" | "added" | "removed"
const TeacherChip = ({ name, periods, mode, unqualified }) => {
  const styles = {
    real: "bg-gray-100  border-gray-200  text-gray-700",
    shadow: "bg-indigo-50 border-indigo-200 text-indigo-800",
    added: "bg-emerald-50 border-emerald-300 text-emerald-800",
    removed:
      "bg-red-50    border-red-200    text-red-700 line-through opacity-60",
  };

  return (
    <div
      className={`flex items-center justify-between gap-1 rounded px-1.5 py-0.5 border text-[10px] font-medium ${styles[mode]}`}
    >
      <span className="truncate max-w-[90px]">{name}</span>
      <div className="flex items-center gap-1 shrink-0">
        <span className="font-mono font-bold">{periods}p</span>
        {unqualified && <AlertTriangle size={9} className="text-amber-500" />}
      </div>
    </div>
  );
};

// ─── Single matrix cell ───────────────────────────────────────────────────────
const MatrixCell = ({ cellImpact, showOnlyChanged, showOnlyProblems }) => {
  if (!cellImpact) {
    // Subject not taught in this grade
    return (
      <td className="bg-gray-50 border-r border-gray-100 p-2 text-center">
        <span className="text-gray-300 text-xs">—</span>
      </td>
    );
  }

  const {
    changed,
    hasConflict,
    gapCreated,
    gapClosed,
    degraded,
    improved,
    realCellAllocs,
    shadowCellAllocs,
    addedTeachers,
    removedTeachers,
    changedPeriods,
    unqualifiedTeachers,
    required,
    realTotal,
    shadowTotal,
    realCellStatus,
    shadowCellStatus,
  } = cellImpact;

  // Apply filter
  if (showOnlyChanged && !changed)
    return <td className="border-r border-gray-100 bg-white p-2" />;
  if (showOnlyProblems && !hasConflict && !gapCreated && !degraded)
    return <td className="border-r border-gray-100 bg-white p-2" />;

  // Cell background based on what happened
  const cellBg =
    hasConflict || gapCreated
      ? "bg-red-50    border-red-200"
      : degraded
        ? "bg-amber-50  border-amber-200"
        : gapClosed || improved
          ? "bg-emerald-50 border-emerald-200"
          : changed
            ? "bg-indigo-50 border-indigo-200"
            : "bg-white border-gray-100";

  // Build the full picture of what's in the shadow state
  // Identify each teacher's state: added, removed, changed, or unchanged
  const realTeacherMap = Object.fromEntries(
    realCellAllocs.map((a) => [a.teacherId, a]),
  );
  const shadowTeacherMap = Object.fromEntries(
    shadowCellAllocs.map((a) => [a.teacherId, a]),
  );

  const allTeacherIds = new Set([
    ...Object.keys(realTeacherMap),
    ...Object.keys(shadowTeacherMap),
  ]);

  const chips = [...allTeacherIds]
    .map((tid) => {
      const real = realTeacherMap[tid];
      const shadow = shadowTeacherMap[tid];
      const unqualified = unqualifiedTeachers.some((u) => u.teacherId === tid);

      if (real && !shadow) {
        // Teacher was removed
        return {
          id: tid,
          name: real.teacherName,
          periods: real.periodsPerWeek,
          mode: "removed",
          unqualified,
        };
      }
      if (!real && shadow) {
        // Teacher was added
        return {
          id: tid,
          name: shadow.teacherName,
          periods: shadow.periodsPerWeek,
          mode: "added",
          unqualified,
        };
      }
      if (real && shadow) {
        const rp = parseInt(real.periodsPerWeek) || 0;
        const sp = parseInt(shadow.periodsPerWeek) || 0;
        if (rp !== sp) {
          // Periods changed — show shadow value
          return {
            id: tid,
            name: shadow.teacherName,
            periods: sp,
            mode: "shadow",
            unqualified,
            prevPeriods: rp,
          };
        }
        // Unchanged
        return {
          id: tid,
          name: shadow.teacherName,
          periods: sp,
          mode: "real",
          unqualified: false,
        };
      }
      return null;
    })
    .filter(Boolean);

  // Period counter colour
  const counterColor =
    shadowTotal >= required
      ? "text-emerald-600"
      : shadowTotal > 0
        ? "text-amber-600"
        : "text-red-500";

  return (
    <td className={`p-2 align-top border-r ${cellBg} transition-colors`}>
      <div className="flex flex-col gap-1 min-w-[150px]">
        {/* Teacher chips */}
        {chips.map((chip) => (
          <div key={chip.id}>
            <TeacherChip
              name={chip.name}
              periods={chip.periods}
              mode={chip.mode}
              unqualified={chip.unqualified}
            />
            {/* Show previous periods for changed entries */}
            {chip.mode === "shadow" && chip.prevPeriods !== undefined && (
              <div className="text-[9px] text-gray-400 pl-1.5 mt-0.5">
                was {chip.prevPeriods}p
              </div>
            )}
          </div>
        ))}

        {/* Empty cell indicator */}
        {chips.length === 0 && required > 0 && (
          <div className="text-[10px] text-red-400 italic">Unassigned</div>
        )}

        {/* Period counter */}
        {required > 0 && (
          <div
            className={`text-[10px] font-mono font-bold mt-0.5 ${counterColor}`}
          >
            {shadowTotal}/{required}p
          </div>
        )}

        {/* Status badges */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {gapCreated && (
            <span className="text-[9px] bg-red-100 text-red-600 border border-red-200 rounded px-1 font-semibold">
              Gap created
            </span>
          )}
          {gapClosed && (
            <span className="text-[9px] bg-emerald-100 text-emerald-600 border border-emerald-200 rounded px-1 font-semibold">
              Gap closed
            </span>
          )}
          {hasConflict && (
            <span className="text-[9px] bg-amber-100 text-amber-600 border border-amber-200 rounded px-1 font-semibold flex items-center gap-0.5">
              <AlertTriangle size={8} /> Unqualified
            </span>
          )}
          {changed && !gapCreated && !gapClosed && !hasConflict && (
            <span className="text-[9px] bg-indigo-100 text-indigo-600 border border-indigo-200 rounded px-1 font-semibold">
              Changed
            </span>
          )}
        </div>
      </div>
    </td>
  );
};

// ─── Grade row header ─────────────────────────────────────────────────────────
const GradeHeader = ({
  grade,
  realAllocations,
  shadowAllocations,
  subjects,
  teacherImpacts,
}) => {
  // Gather all teachers who teach in this grade in either state
  const affectedTeacherIds = new Set([
    ...realAllocations
      .filter((a) => a.gradeId === grade.id)
      .map((a) => a.teacherId),
    ...shadowAllocations
      .filter((a) => a.gradeId === grade.id)
      .map((a) => a.teacherId),
  ]);

  const changedTeachers = [...affectedTeacherIds]
    .map((id) => teacherImpacts[id])
    .filter((t) => t?.changed);

  return (
    <td className="px-3 py-3 sticky left-0 bg-white z-10 border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] min-w-[160px]">
      <div className="text-sm font-bold text-gray-900 mb-1">{grade.name}</div>

      {/* Affected teacher mini-bars */}
      {changedTeachers.length > 0 && (
        <div className="space-y-1.5">
          {changedTeachers.map((t) => (
            <div key={t.teacher.id}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-gray-600 font-medium truncate max-w-[100px]">
                  {t.teacher.name}
                </span>
                {t.becameOverloaded && (
                  <AlertTriangle size={10} className="text-red-500 shrink-0" />
                )}
                {t.wasRelieved && (
                  <CheckCircle2
                    size={10}
                    className="text-emerald-500 shrink-0"
                  />
                )}
              </div>
              {/* Before bar (faded) */}
              <LoadBar load={t.realLoad} max={t.realMax} />
              {/* Arrow */}
              <div className="flex items-center gap-1 my-0.5">
                <ArrowRight size={9} className="text-gray-400" />
                <span className="text-[9px] text-gray-400">after</span>
              </div>
              {/* After bar */}
              <LoadBar load={t.shadowLoad} max={t.shadowMax} />
            </div>
          ))}
        </div>
      )}
    </td>
  );
};

// ─── Main ImpactMatrix component ──────────────────────────────────────────────
const ImpactMatrix = ({
  grades,
  subjects,
  teachers,
  realAllocations,
  shadowAllocations,
  cellImpacts,
  teacherImpacts,
  changes,
}) => {
  const [filter, setFilter] = useState("all");
  const [showLegend, setShowLegend] = useState(true);

  const showOnlyChanged = filter === "changed";
  const showOnlyProblems = filter === "problem";

  // Count changed and problem cells for filter button labels
  const changedCount = Object.values(cellImpacts).filter(
    (c) => c.changed,
  ).length;
  const problemCount = Object.values(cellImpacts).filter(
    (c) => c.hasConflict || c.gapCreated || c.degraded,
  ).length;

  if (changes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <div className="text-center">
          <Eye size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-400">
            The impact matrix will appear here
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Add at least one change to see the before/after view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Filter size={12} className="text-gray-400 ml-1" />
          {FILTER_OPTIONS.map((opt) => {
            const count =
              opt.value === "changed"
                ? changedCount
                : opt.value === "problem"
                  ? problemCount
                  : null;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  filter === opt.value
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
                {count !== null && count > 0 && (
                  <span
                    className={`text-[10px] px-1 rounded-full font-bold ${
                      filter === opt.value
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend toggle */}
        <button
          onClick={() => setShowLegend((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {showLegend ? <EyeOff size={13} /> : <Eye size={13} />}
          {showLegend ? "Hide legend" : "Show legend"}
        </button>
      </div>

      {/* ── Legend ── */}
      {showLegend && (
        <div className="flex flex-wrap gap-3 text-[11px] bg-white border border-gray-200 rounded-lg px-3 py-2 shrink-0">
          {[
            { color: "bg-indigo-50  border-indigo-200", label: "Changed" },
            { color: "bg-emerald-50 border-emerald-200", label: "Improved" },
            { color: "bg-amber-50   border-amber-200", label: "Degraded" },
            { color: "bg-red-50     border-red-200", label: "Problem" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded border ${item.color}`} />
              <span className="text-gray-600">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-300 flex items-center justify-center text-[8px] text-emerald-700 font-bold">
              +
            </span>
            <span className="text-gray-600">Added teacher</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-50 border border-red-300 opacity-60" />
            <span className="text-gray-600">Removed teacher</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-amber-500" />
            <span className="text-gray-600">Unqualified</span>
          </div>
        </div>
      )}

      {/* ── Matrix table ── */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-auto shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Column headers */}
          <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-30 min-w-[160px] border-r border-gray-300">
                Grade
              </th>
              {subjects.map((subject) => {
                // Highlight subject column header if any cell in it changed
                const colChanged = grades.some((g) => {
                  const key = `${g.id}_${subject.id}`;
                  return cellImpacts[key]?.changed;
                });
                return (
                  <th
                    key={subject.id}
                    className={`px-2 py-3 text-center text-xs font-bold uppercase tracking-wider min-w-[170px] border-r border-gray-200 last:border-0 ${
                      colChanged
                        ? "text-indigo-700 bg-indigo-50"
                        : "text-gray-700"
                    }`}
                  >
                    {subject.name}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Rows */}
          <tbody className="divide-y divide-gray-200">
            {grades.map((grade) => (
              <tr
                key={grade.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                {/* Sticky grade header cell with load bars */}
                <GradeHeader
                  grade={grade}
                  realAllocations={realAllocations}
                  shadowAllocations={shadowAllocations}
                  subjects={subjects}
                  teacherImpacts={teacherImpacts}
                />

                {/* Subject cells */}
                {subjects.map((subject) => {
                  const isTaught = subject.gradeIds?.includes(grade.id);
                  const key = `${grade.id}_${subject.id}`;
                  const impact = cellImpacts[key];

                  if (!isTaught) {
                    return (
                      <td
                        key={subject.id}
                        className="bg-gray-50 border-r border-gray-100 p-2 text-center"
                      >
                        <span className="text-gray-300 text-xs">—</span>
                      </td>
                    );
                  }

                  return (
                    <MatrixCell
                      key={subject.id}
                      cellImpact={impact}
                      showOnlyChanged={showOnlyChanged}
                      showOnlyProblems={showOnlyProblems}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ImpactMatrix;
