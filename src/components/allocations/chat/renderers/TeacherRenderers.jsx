import React from "react";
import {
  User,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { PctBar, Badge } from "../shared/ui";

// ─── Teacher Info ─────────────────────────────────────────────────────────────
// Result of: "what does Sara teach?" / "Sara's workload"
export const TeacherInfoRenderer = ({ result }) => {
  const { teacher, load, max, pct, allocations } = result;
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
      {allocations.length > 0 ? (
        <div className="mt-2 space-y-1">
          {allocations.map((a) => (
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
};

// ─── Overloaded Teachers ──────────────────────────────────────────────────────
// Result of: "who is overloaded?" / "busiest teachers"
export const OverloadedRenderer = ({ result }) => {
  const { list } = result;

  if (list.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs bg-emerald-500/20 rounded-lg px-3 py-2">
        <CheckCircle2 size={11} className="text-emerald-400" />
        No teachers are overloaded. Everyone is under 90% capacity.
      </div>
    );
  }

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
};

// ─── Underutilised Teachers ───────────────────────────────────────────────────
// Result of: "who has free periods?" / "least loaded"
export const UnderutilisedRenderer = ({ result }) => {
  const { list } = result;

  if (list.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs bg-amber-500/20 rounded-lg px-3 py-2">
        <Info size={11} className="text-amber-400" />
        All teachers are above 50% utilisation.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingDown size={12} className="text-blue-400" />
        <p className="text-xs font-bold text-blue-300">
          {list.length} teacher{list.length !== 1 ? "s" : ""} with room for more
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
};

// ─── Compare Two Teachers ─────────────────────────────────────────────────────
// Result of: "compare Ahmed and Sara"
export const CompareRenderer = ({ result }) => {
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
    { label: "Subjects", v1: t1.subjectCount, v2: t2.subjectCount, better: 0 },
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
};
