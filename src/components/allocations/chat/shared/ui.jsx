import React from "react";

// ─── Load progress bar ────────────────────────────────────────────────────────
// Shows a coloured bar representing current/max load.
// Green = healthy, Amber = getting busy, Red = overloaded.
export const PctBar = ({ current, max, showLabel = true }) => {
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

// ─── Utilisation percentage badge ─────────────────────────────────────────────
// Small pill showing percentage with colour-coded background.
export const Badge = ({ pct }) => (
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

// ─── Allocation status dot ────────────────────────────────────────────────────
// Tiny coloured circle used in coverage and completion views.
// full = green, partial = amber, empty = red.
export const StatusDot = ({ status }) => {
  const colorMap = {
    full: "bg-emerald-400",
    partial: "bg-amber-400",
    empty: "bg-red-400",
  };
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 ${
        colorMap[status] || "bg-gray-400"
      }`}
    />
  );
};
