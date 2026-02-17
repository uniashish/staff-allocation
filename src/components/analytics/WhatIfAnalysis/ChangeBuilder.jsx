import React, { useState, useMemo } from "react";
import {
  Plus,
  X,
  ArrowRightLeft,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Trash2,
} from "lucide-react";
import {
  applyShadowChanges,
  validateChange,
  sumLoad,
  loadStatus,
  statusColors,
} from "./shadowEngine";

// ─── Change type tab config ───────────────────────────────────────────────────
const CHANGE_TYPES = [
  {
    type: "reassign",
    label: "Reassign Periods",
    icon: ArrowRightLeft,
    description: "Move periods from one teacher to another in a specific cell.",
  },
  {
    type: "maxload",
    label: "Change Max Load",
    icon: Sliders,
    description: "Adjust the maximum periods a teacher can be assigned.",
  },
];

// ─── Styled select ────────────────────────────────────────────────────────────
const Select = ({ value, onChange, children, disabled }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
    >
      {children}
    </select>
    <ChevronDown
      size={14}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
    />
  </div>
);

// ─── Mini load bar used inside change cards ───────────────────────────────────
const MiniLoadBar = ({ load, max, label }) => {
  const pct = Math.min(100, Math.round((load / (max || 30)) * 100));
  const status = loadStatus(load, max);
  const colors = statusColors[status];
  return (
    <div>
      {label && <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${colors.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[10px] font-mono font-bold ${colors.text}`}>
          {load}/{max}
        </span>
      </div>
    </div>
  );
};

// ─── Individual change card (read-only, already added) ────────────────────────
const ChangeCard = ({
  change,
  index,
  onRemove,
  teachers,
  grades,
  subjects,
}) => {
  const fromTeacher = teachers.find((t) => t.id === change.fromTeacherId);
  const toTeacher = teachers.find((t) => t.id === change.toTeacherId);
  const teacher = teachers.find((t) => t.id === change.teacherId);
  const grade = grades.find((g) => g.id === change.gradeId);
  const subject = subjects.find((s) => s.id === change.subjectId);

  const hasWarnings = change.warnings?.length > 0;

  return (
    <div
      className={`rounded-xl border p-3 text-sm relative ${
        hasWarnings
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Card number + remove */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            {change.type === "reassign"
              ? "Reassign Periods"
              : "Change Max Load"}
          </span>
        </div>
        <button
          onClick={() => onRemove(change.id)}
          className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
        >
          <X size={14} />
        </button>
      </div>

      {/* Card body */}
      {change.type === "reassign" && (
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-gray-800">
              {fromTeacher?.name ?? "Unknown"}
            </span>
            <ArrowRightLeft size={11} className="text-gray-400 shrink-0" />
            <span className="font-semibold text-gray-800">
              {toTeacher?.name ?? "Unknown"}
            </span>
          </div>
          <div className="text-gray-500">
            {grade?.name} · {subject?.name} ·{" "}
            <span className="font-bold text-indigo-600">{change.periods}p</span>
          </div>
        </div>
      )}

      {change.type === "maxload" && (
        <div className="text-xs text-gray-600 space-y-0.5">
          <span className="font-semibold text-gray-800">{teacher?.name}</span>
          <div className="text-gray-500">
            Max load:{" "}
            <span className="line-through text-gray-400">
              {parseInt(teacher?.maxLoad) || 30}
            </span>{" "}
            →{" "}
            <span className="font-bold text-indigo-600">
              {change.newMaxLoad}
            </span>
          </div>
        </div>
      )}

      {/* Inline warnings */}
      {hasWarnings && (
        <div className="mt-2 space-y-1">
          {change.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-[11px] text-amber-700"
            >
              <AlertTriangle size={10} className="mt-0.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main ChangeBuilder component ─────────────────────────────────────────────
const ChangeBuilder = ({
  grades,
  subjects,
  teachers,
  realAllocations,
  changes,
  onAddChange,
  onRemoveChange,
  onClearAll,
}) => {
  const [activeType, setActiveType] = useState("reassign");

  // Reassign form state
  const [fromTeacherId, setFromTeacherId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [toTeacherId, setToTeacherId] = useState("");
  const [periods, setPeriods] = useState(1);

  // Max load form state
  const [maxTeacherId, setMaxTeacherId] = useState("");
  const [newMaxLoad, setNewMaxLoad] = useState("");

  // ── Compute current shadow allocations for validation ──
  const shadowAllocations = useMemo(
    () => applyShadowChanges(realAllocations, changes, teachers),
    [realAllocations, changes, teachers],
  );

  const shadowMaxLoads = useMemo(() => {
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
  }, [teachers, changes]);

  // ── Derived options ────────────────────────────────────────────────────────

  // Cells where fromTeacher has allocations
  const availableCells = useMemo(() => {
    if (!fromTeacherId) return [];
    return shadowAllocations
      .filter((a) => a.teacherId === fromTeacherId)
      .map((a) => {
        const grade = grades.find((g) => g.id === a.gradeId);
        const subject = subjects.find((s) => s.id === a.subjectId);
        return grade && subject
          ? {
              gradeId: a.gradeId,
              subjectId: a.subjectId,
              gradeName: grade.name,
              subjectName: subject.name,
              periods: parseInt(a.periodsPerWeek) || 0,
            }
          : null;
      })
      .filter(Boolean);
  }, [fromTeacherId, shadowAllocations, grades, subjects]);

  // Max periods available to move from selected cell
  const maxMovable = useMemo(() => {
    if (!fromTeacherId || !gradeId || !subjectId) return 0;
    const alloc = shadowAllocations.find(
      (a) =>
        a.teacherId === fromTeacherId &&
        a.gradeId === gradeId &&
        a.subjectId === subjectId,
    );
    return parseInt(alloc?.periodsPerWeek) || 0;
  }, [fromTeacherId, gradeId, subjectId, shadowAllocations]);

  // Qualified teachers for selected subject (excluding fromTeacher)
  const qualifiedTargets = useMemo(() => {
    if (!subjectId || !fromTeacherId) return [];
    return teachers.filter(
      (t) => t.id !== fromTeacherId && t.subjectIds?.includes(subjectId),
    );
  }, [subjectId, fromTeacherId, teachers]);

  // Live preview of the candidate change for validation
  const candidateChange = useMemo(() => {
    if (activeType === "reassign") {
      if (!fromTeacherId || !toTeacherId || !gradeId || !subjectId || !periods)
        return null;
      const toTeacher = teachers.find((t) => t.id === toTeacherId);
      const grade = grades.find((g) => g.id === gradeId);
      const subject = subjects.find((s) => s.id === subjectId);
      return {
        type: "reassign",
        fromTeacherId,
        toTeacherId,
        gradeId,
        subjectId,
        periods: parseInt(periods),
        toTeacherName: toTeacher?.name,
        gradeName: grade?.name,
        subjectName: subject?.name,
      };
    }
    if (activeType === "maxload") {
      if (!maxTeacherId || !newMaxLoad) return null;
      return {
        type: "maxload",
        teacherId: maxTeacherId,
        newMaxLoad: parseInt(newMaxLoad),
      };
    }
    return null;
  }, [
    activeType,
    fromTeacherId,
    toTeacherId,
    gradeId,
    subjectId,
    periods,
    maxTeacherId,
    newMaxLoad,
    teachers,
    grades,
    subjects,
  ]);

  // Live warnings for the current form
  const liveWarnings = useMemo(() => {
    if (!candidateChange) return [];
    return validateChange(
      candidateChange,
      shadowAllocations,
      teachers,
      shadowMaxLoads,
    );
  }, [candidateChange, shadowAllocations, teachers, shadowMaxLoads]);

  // ── Stats for selected teachers (preview panels) ──────────────────────────
  const fromTeacherStats = useMemo(() => {
    if (!fromTeacherId) return null;
    const t = teachers.find((t) => t.id === fromTeacherId);
    return t
      ? {
          load: sumLoad(shadowAllocations, t.id),
          max: shadowMaxLoads[t.id] ?? (parseInt(t.maxLoad) || 30),
        }
      : null;
  }, [fromTeacherId, shadowAllocations, shadowMaxLoads, teachers]);

  const toTeacherStats = useMemo(() => {
    if (!toTeacherId) return null;
    const t = teachers.find((t) => t.id === toTeacherId);
    return t
      ? {
          load: sumLoad(shadowAllocations, t.id),
          max: shadowMaxLoads[t.id] ?? (parseInt(t.maxLoad) || 30),
        }
      : null;
  }, [toTeacherId, shadowAllocations, shadowMaxLoads, teachers]);

  const maxTeacherStats = useMemo(() => {
    if (!maxTeacherId) return null;
    const t = teachers.find((t) => t.id === maxTeacherId);
    return t
      ? {
          load: sumLoad(shadowAllocations, t.id),
          max: shadowMaxLoads[t.id] ?? (parseInt(t.maxLoad) || 30),
        }
      : null;
  }, [maxTeacherId, shadowAllocations, shadowMaxLoads, teachers]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFromTeacherChange = (id) => {
    setFromTeacherId(id);
    setGradeId("");
    setSubjectId("");
    setToTeacherId("");
    setPeriods(1);
  };

  const handleCellChange = (val) => {
    const [gId, sId] = val.split("__");
    setGradeId(gId || "");
    setSubjectId(sId || "");
    setToTeacherId("");
    setPeriods(1);
  };

  const handleAdd = () => {
    if (!candidateChange) return;
    const warnings = validateChange(
      candidateChange,
      shadowAllocations,
      teachers,
      shadowMaxLoads,
    );
    onAddChange({ ...candidateChange, id: Date.now(), warnings });
    resetForms();
  };

  const resetForms = () => {
    setFromTeacherId("");
    setGradeId("");
    setSubjectId("");
    setToTeacherId("");
    setPeriods(1);
    setMaxTeacherId("");
    setNewMaxLoad("");
  };

  const canAdd =
    !!candidateChange &&
    (activeType === "reassign"
      ? fromTeacherId &&
        toTeacherId &&
        gradeId &&
        subjectId &&
        parseInt(periods) > 0
      : maxTeacherId && parseInt(newMaxLoad) > 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Type tabs ── */}
      <div className="flex rounded-xl bg-gray-100 p-1 mb-4 gap-1">
        {CHANGE_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => {
              setActiveType(type);
              resetForms();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeType === type
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Type description ── */}
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        {CHANGE_TYPES.find((c) => c.type === activeType)?.description}
      </p>

      {/* ════════════════════════════════════════════════════════════════════
          REASSIGN FORM
      ════════════════════════════════════════════════════════════════════ */}
      {activeType === "reassign" && (
        <div className="space-y-3">
          {/* From teacher */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Move FROM
            </label>
            <Select value={fromTeacherId} onChange={handleFromTeacherChange}>
              <option value="">Select teacher…</option>
              {teachers
                .filter((t) =>
                  shadowAllocations.some((a) => a.teacherId === t.id),
                )
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </Select>
            {fromTeacherStats && (
              <div className="mt-1.5">
                <MiniLoadBar
                  load={fromTeacherStats.load}
                  max={fromTeacherStats.max}
                />
              </div>
            )}
          </div>

          {/* Cell */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Cell (Grade · Subject)
            </label>
            <Select
              value={gradeId && subjectId ? `${gradeId}__${subjectId}` : ""}
              onChange={handleCellChange}
              disabled={!fromTeacherId}
            >
              <option value="">Select cell…</option>
              {availableCells.map((c) => (
                <option
                  key={`${c.gradeId}__${c.subjectId}`}
                  value={`${c.gradeId}__${c.subjectId}`}
                >
                  {c.gradeName} · {c.subjectName} ({c.periods}p)
                </option>
              ))}
            </Select>
          </div>

          {/* Periods */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Periods to move{maxMovable > 0 ? ` (max ${maxMovable})` : ""}
            </label>
            <input
              type="number"
              min={1}
              max={maxMovable || undefined}
              value={periods}
              onChange={(e) => setPeriods(e.target.value)}
              disabled={!gradeId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* To teacher */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Move TO
            </label>
            <Select
              value={toTeacherId}
              onChange={setToTeacherId}
              disabled={!subjectId}
            >
              <option value="">Select teacher…</option>
              {qualifiedTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {toTeacherStats && (
              <div className="mt-1.5">
                <MiniLoadBar
                  load={toTeacherStats.load}
                  max={toTeacherStats.max}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MAX LOAD FORM
      ════════════════════════════════════════════════════════════════════ */}
      {activeType === "maxload" && (
        <div className="space-y-3">
          {/* Teacher */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Teacher
            </label>
            <Select
              value={maxTeacherId}
              onChange={(id) => {
                setMaxTeacherId(id);
                setNewMaxLoad("");
              }}
            >
              <option value="">Select teacher…</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {maxTeacherStats && (
              <div className="mt-1.5">
                <MiniLoadBar
                  load={maxTeacherStats.load}
                  max={maxTeacherStats.max}
                  label={`Current load: ${maxTeacherStats.load}/${maxTeacherStats.max}p`}
                />
              </div>
            )}
          </div>

          {/* New max */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              New max load (periods/week)
            </label>
            <input
              type="number"
              min={1}
              value={newMaxLoad}
              onChange={(e) => setNewMaxLoad(e.target.value)}
              placeholder={
                maxTeacherId
                  ? `Current: ${shadowMaxLoads[maxTeacherId] ?? "—"}`
                  : "Enter value…"
              }
              disabled={!maxTeacherId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>
      )}

      {/* ── Live warnings ── */}
      {liveWarnings.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 space-y-1.5">
          {liveWarnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-amber-700"
            >
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* ── Add button ── */}
      <button
        onClick={handleAdd}
        disabled={!canAdd}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
      >
        <Plus size={15} />
        Add to Scenario
      </button>

      {/* ── Change cards list ── */}
      {changes.length > 0 && (
        <div className="mt-5 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Scenario ({changes.length} change{changes.length !== 1 ? "s" : ""}
              )
            </p>
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={11} />
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {changes.map((change, i) => (
              <ChangeCard
                key={change.id}
                change={change}
                index={i}
                onRemove={onRemoveChange}
                teachers={teachers}
                grades={grades}
                subjects={subjects}
              />
            ))}
          </div>
        </div>
      )}

      {changes.length === 0 && (
        <div className="mt-6 text-center text-xs text-gray-400 italic">
          No changes added yet. Build your scenario above.
        </div>
      )}
    </div>
  );
};

export default ChangeBuilder;
