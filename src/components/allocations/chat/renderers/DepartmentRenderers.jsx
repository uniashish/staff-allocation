import React from "react";
import { PctBar, Badge } from "../shared/ui";

// ─── Department Load Summary ──────────────────────────────────────────────────
// Result of: "English department load" / "Science dept summary"
export const DepartmentLoadRenderer = ({ result }) => {
  const { deptName, list, totalLoad, totalMax, avgPct } = result;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold">{deptName} Dept</p>
        <Badge pct={avgPct} />
      </div>

      {/* Overall department bar */}
      <PctBar current={totalLoad} max={totalMax} />
      <p className="text-[10px] opacity-40 mt-1 mb-3">
        {list.length} teacher{list.length !== 1 ? "s" : ""} · {totalLoad}/
        {totalMax}p total
      </p>

      {/* Individual teachers */}
      <div className="space-y-2">
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
};
