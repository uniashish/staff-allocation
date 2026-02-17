import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Users,
} from "lucide-react";

// ─── Single stat tile ─────────────────────────────────────────────────────────
const StatTile = ({
  label,
  before,
  after,
  delta,
  positiveIsGood,
  icon: Icon,
  alwaysNeutral,
}) => {
  const changed = delta !== 0;

  // Determine whether the change is good, bad, or neutral
  const sentiment =
    alwaysNeutral || !changed
      ? "neutral"
      : positiveIsGood
        ? delta > 0
          ? "good"
          : "bad"
        : delta > 0
          ? "bad"
          : "good";

  const sentimentStyles = {
    good: "text-emerald-600",
    bad: "text-red-600",
    neutral: "text-gray-500",
  };

  const deltaStyles = {
    good: "bg-emerald-50 border-emerald-200 text-emerald-700",
    bad: "bg-red-50    border-red-200    text-red-700",
    neutral: "bg-gray-50   border-gray-200   text-gray-500",
  };

  const DeltaIcon = !changed ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-col gap-1.5">
      {/* Label + icon */}
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-gray-400 shrink-0" />}
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide truncate">
          {label}
        </span>
      </div>

      {/* Before → After */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-gray-800">{after}</span>
        {changed && (
          <span className="text-xs text-gray-400 line-through">{before}</span>
        )}
      </div>

      {/* Delta badge */}
      <div
        className={`self-start flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded border ${
          deltaStyles[sentiment]
        }`}
      >
        <DeltaIcon size={10} />
        {!changed ? "No change" : `${delta > 0 ? "+" : ""}${delta}`}
      </div>
    </div>
  );
};

// ─── Overload teacher pills ───────────────────────────────────────────────────
const OverloadPills = ({ teacherImpacts }) => {
  const newlyOverloaded = Object.values(teacherImpacts).filter(
    (t) => t.becameOverloaded,
  );
  const relieved = Object.values(teacherImpacts).filter((t) => t.wasRelieved);

  if (newlyOverloaded.length === 0 && relieved.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {newlyOverloaded.map((t) => (
        <div
          key={t.teacher.id}
          className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1"
        >
          <AlertTriangle size={11} className="text-red-500 shrink-0" />
          <span className="text-xs font-semibold text-red-700">
            {t.teacher.name}
          </span>
          <span className="text-[10px] text-red-500 font-mono">
            {t.shadowLoad}/{t.shadowMax}p
          </span>
        </div>
      ))}
      {relieved.map((t) => (
        <div
          key={t.teacher.id}
          className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1"
        >
          <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
          <span className="text-xs font-semibold text-emerald-700">
            {t.teacher.name}
          </span>
          <span className="text-[10px] text-emerald-500 font-mono">
            {t.shadowLoad}/{t.shadowMax}p
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Empty state (no changes yet) ────────────────────────────────────────────
const EmptyState = () => (
  <div className="bg-white rounded-xl border border-dashed border-gray-300 px-6 py-5 text-center">
    <Activity size={20} className="mx-auto text-gray-300 mb-2" />
    <p className="text-sm font-medium text-gray-400">
      Add changes to see the impact
    </p>
    <p className="text-xs text-gray-400 mt-0.5">
      The summary will update live as you build your scenario.
    </p>
  </div>
);

// ─── Main ImpactSummary component ─────────────────────────────────────────────
const ImpactSummary = ({ summary, teacherImpacts, changes }) => {
  if (!summary || changes.length === 0) {
    return <EmptyState />;
  }

  const {
    realTotalPeriods,
    shadowTotalPeriods,
    periodsDelta,
    gapsCreated,
    gapsClosed,
    overloadedBefore,
    overloadedAfter,
    overloadDelta,
  } = summary;

  return (
    <div className="space-y-3">
      {/* ── 4 stat tiles ── */}
      <div className="flex gap-3 flex-wrap">
        <StatTile
          label="Allocated Periods"
          before={realTotalPeriods}
          after={shadowTotalPeriods}
          delta={periodsDelta}
          positiveIsGood={true}
          icon={Activity}
        />
        <StatTile
          label="Gaps Created"
          before={0}
          after={gapsCreated}
          delta={gapsCreated}
          positiveIsGood={false}
          icon={TrendingDown}
        />
        <StatTile
          label="Gaps Closed"
          before={0}
          after={gapsClosed}
          delta={gapsClosed}
          positiveIsGood={true}
          icon={CheckCircle2}
        />
        <StatTile
          label="Overloaded Teachers"
          before={overloadedBefore}
          after={overloadedAfter}
          delta={overloadDelta}
          positiveIsGood={false}
          icon={Users}
        />
      </div>

      {/* ── Affected teacher pills ── */}
      <OverloadPills teacherImpacts={teacherImpacts} />
    </div>
  );
};

export default ImpactSummary;
