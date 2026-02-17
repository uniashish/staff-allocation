import React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { PctBar, Badge, StatusDot } from "../shared/ui";

// ─── Who teaches a subject in a grade ────────────────────────────────────────
// Result of: "who teaches Math in Grade 5?"
export const CellInfoRenderer = ({ result }) => {
  const { grade, subject, allocations } = result;

  return (
    <div>
      <p className="text-xs font-bold mb-2">
        {subject.name} in {grade.name}
      </p>
      {allocations.map((a) => (
        <div key={a.id} className="mb-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold">{a.teacherName}</span>
            <span className="font-mono opacity-70">{a.periodsPerWeek}p/wk</span>
          </div>
          <PctBar current={a.load} max={a.max} />
        </div>
      ))}
    </div>
  );
};

// ─── Empty cell notice ────────────────────────────────────────────────────────
// Shown when "who teaches X in Y?" finds no assignments.
export const EmptyCellRenderer = ({ result }) => (
  <div className="flex items-start gap-2">
    <Info size={13} className="text-blue-300 mt-0.5 shrink-0" />
    <p
      className="text-xs leading-relaxed"
      dangerouslySetInnerHTML={{
        __html: result.message.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
      }}
    />
  </div>
);

// ─── Subject coverage across all grades ──────────────────────────────────────
// Result of: "is Math fully covered?" / "Science coverage"
export const SubjectCoverageRenderer = ({ result }) => {
  const { subject, rows, totalRequired, totalAllocated, overallPct } = result;

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs bg-amber-500/20 rounded-lg px-3 py-2">
        <Info size={11} className="text-amber-400" />
        {subject.name} is not assigned to any grade.
      </div>
    );
  }

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
};

// ─── Unallocated gaps ─────────────────────────────────────────────────────────
// Result of: "show gaps" / "what is unallocated?"
export const GapsRenderer = ({ result }) => {
  const { gaps } = result;

  if (gaps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs bg-emerald-500/20 rounded-lg px-3 py-2">
        <CheckCircle2 size={11} className="text-emerald-400" />
        All cells are fully allocated. No gaps found!
      </div>
    );
  }

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
};

// ─── Grade completion status ──────────────────────────────────────────────────
// Result of: "how complete is Grade 7?"
export const GradeCompletionRenderer = ({ result }) => {
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
};
