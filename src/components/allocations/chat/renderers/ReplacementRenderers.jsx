import React from "react";
import { ArrowRightLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PctBar, Badge } from "../shared/ui";

// ─── Replace in a specific cell ───────────────────────────────────────────────
// Result of: "replace Ahmed with Sara in Grade 5 for Math"
export const ReplaceCellRenderer = ({ result }) => {
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

      {/* Qualification check */}
      <div
        className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-1.5 ${
          isQualified ? "bg-emerald-500/20" : "bg-red-500/20"
        }`}
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

      {/* Capacity check */}
      <div
        className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-1.5 ${
          overCapacity ? "bg-red-500/20" : "bg-emerald-500/20"
        }`}
      >
        {overCapacity ? (
          <AlertTriangle size={11} className="text-red-400" />
        ) : (
          <CheckCircle2 size={11} className="text-emerald-400" />
        )}
        {to.name}: {toNewLoad}/{toMax}{" "}
        {overCapacity ? `— OVER by ${toNewLoad - toMax}p` : "— within capacity"}
      </div>

      <p className="text-[10px] opacity-50 mt-1">
        {periodsNeeded}p transferred · {from.name} freed → {fromNewLoad}p
      </p>
    </div>
  );
};

// ─── Replace teacher globally (all their cells) ───────────────────────────────
// Result of: "replace Ahmed with Sara" / "can Sara take over from Ahmed?"
export const ReplaceGlobalRenderer = ({ result }) => {
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
          <AlertTriangle size={11} className="text-amber-400 mt-0.5 shrink-0" />
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
};

// ─── Remove teacher / what if leaves ─────────────────────────────────────────
// Result of: "what if Ahmed leaves?"
export const RemoveRenderer = ({ result }) => {
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
};

// ─── Find a substitute ────────────────────────────────────────────────────────
// Result of: "who can cover Ahmed in Grade 5 for Math?"
export const FindSubstituteRenderer = ({ result }) => {
  const { grade, subject, periodsNeeded, candidates } = result;

  if (candidates.length === 0) {
    return (
      <div className="flex items-start gap-2 text-xs bg-red-500/20 rounded-lg px-3 py-2">
        <AlertTriangle size={11} className="text-red-400 mt-0.5 shrink-0" />
        No qualified teachers with available capacity found for {
          subject.name
        }{" "}
        in {grade.name}.
      </div>
    );
  }

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
};
