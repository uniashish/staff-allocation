import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseUtils";
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RotateCcw,
  Save,
  ChevronRight,
  Info,
  Loader2,
  Users,
  BookOpen,
  BarChart2,
  ArrowLeft,
} from "lucide-react";

// ─── Algorithm (same logic as SmartAllocate modal) ───────────────────────────
const runAutoAllocate = ({ grades, subjects, teachers, allocations }) => {
  const proposed = [];
  const conflicts = [];

  const tempLoads = {};
  teachers.forEach((t) => {
    tempLoads[t.id] = allocations
      .filter((a) => a.teacherId === t.id)
      .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);
  });

  grades.forEach((grade) => {
    subjects.forEach((subject) => {
      if (!subject.gradeIds?.includes(grade.id)) return;

      const existingPeriods = allocations
        .filter((a) => a.gradeId === grade.id && a.subjectId === subject.id)
        .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

      const detail = subject.gradeDetails?.find((g) => g.id === grade.id);
      const required = parseInt(detail?.periods) || 0;
      let remaining = required - existingPeriods;

      if (remaining <= 0) return;

      const qualified = teachers
        .filter((t) => t.subjectIds?.includes(subject.id))
        .map((t) => ({
          ...t,
          maxLoad: parseInt(t.maxLoad) || 30,
          currentLoad: tempLoads[t.id] ?? 0,
        }))
        .filter((t) => t.currentLoad < t.maxLoad)
        .sort(
          (a, b) => b.maxLoad - b.currentLoad - (a.maxLoad - a.currentLoad),
        );

      if (qualified.length === 0) {
        conflicts.push({
          id: `${grade.id}_${subject.id}`,
          grade,
          subject,
          needed: remaining,
          reason: "No qualified teachers with available capacity",
        });
        return;
      }

      for (const teacher of qualified) {
        if (remaining <= 0) break;
        const canAssign = Math.min(
          remaining,
          teacher.maxLoad - teacher.currentLoad,
        );
        if (canAssign > 0) {
          proposed.push({
            id: `${grade.id}_${subject.id}_${teacher.id}`,
            gradeId: grade.id,
            gradeName: grade.name,
            subjectId: subject.id,
            subjectName: subject.name,
            teacherId: teacher.id,
            teacherName: teacher.name,
            periodsPerWeek: canAssign,
          });
          tempLoads[teacher.id] = (tempLoads[teacher.id] ?? 0) + canAssign;
          remaining -= canAssign;
        }
      }

      if (remaining > 0) {
        conflicts.push({
          id: `${grade.id}_${subject.id}_partial`,
          grade,
          subject,
          needed: remaining,
          reason: `${remaining} period${remaining > 1 ? "s" : ""} could not be filled — teachers at capacity`,
        });
      }
    });
  });

  return { proposed, conflicts };
};

// ─── Load Bar ─────────────────────────────────────────────────────────────────
const LoadBar = ({ current, max }) => {
  const pct = Math.min(100, (current / (max || 30)) * 100);
  const color =
    pct > 90 ? "bg-red-400" : pct > 70 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-400 font-mono tabular-nums whitespace-nowrap">
        {current}/{max}
      </span>
    </div>
  );
};

// ─── Step Indicator ───────────────────────────────────────────────────────────
const StepIndicator = ({ step }) => {
  const steps = ["Generate", "Review", "Done"];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < step
                  ? "bg-green-500 text-white"
                  : i === step
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-400"
              }`}
            >
              {i < step ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span
              className={`text-sm font-medium ${
                i === step ? "text-indigo-700" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-8 transition-all duration-300 ${
                i < step ? "bg-green-400" : "bg-gray-200"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const SmartAllocatePage = () => {
  const { school } = useOutletContext();
  const navigate = useNavigate();

  // Data
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Wizard state
  const [step, setStep] = useState(0);
  const [proposed, setProposed] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [removed, setRemoved] = useState(new Set());
  const [editingPeriods, setEditingPeriods] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    if (!school?.id) return;
    setDataLoading(true);
    try {
      const [gradeSnap, subjSnap, teachSnap, allocSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "schools", school.id, "grades"),
            orderBy("name"),
          ),
        ),
        getDocs(
          query(
            collection(db, "schools", school.id, "subjects"),
            orderBy("name"),
          ),
        ),
        getDocs(
          query(
            collection(db, "schools", school.id, "teachers"),
            orderBy("name"),
          ),
        ),
        getDocs(collection(db, "schools", school.id, "allocations")),
      ]);
      setGrades(gradeSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSubjects(subjSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTeachers(teachSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAllocations(allocSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("SmartAllocatePage fetch error:", err);
    } finally {
      setDataLoading(false);
    }
  }, [school?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Wizard actions ──
  const handleGenerate = () => {
    const result = runAutoAllocate({ grades, subjects, teachers, allocations });
    setProposed(result.proposed);
    setConflicts(result.conflicts);
    setRemoved(new Set());
    setEditingPeriods({});
    setStep(1);
  };

  const handleReset = () => {
    setStep(0);
    setProposed([]);
    setConflicts([]);
    setRemoved(new Set());
    setEditingPeriods({});
  };

  const toggleRemove = (id) => {
    setRemoved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeProposed = proposed.filter((p) => !removed.has(p.id));

  const handleSave = async () => {
    if (activeProposed.length === 0) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      activeProposed.forEach((alloc) => {
        const periods =
          editingPeriods[alloc.id] !== undefined
            ? parseInt(editingPeriods[alloc.id])
            : alloc.periodsPerWeek;
        const docRef = doc(db, "schools", school.id, "allocations", alloc.id);
        batch.set(docRef, {
          gradeId: alloc.gradeId,
          gradeName: alloc.gradeName,
          subjectId: alloc.subjectId,
          subjectName: alloc.subjectName,
          teacherId: alloc.teacherId,
          teacherName: alloc.teacherName,
          periodsPerWeek: isNaN(periods) ? alloc.periodsPerWeek : periods,
          updatedAt: new Date(),
        });
      });
      await batch.commit();
      await fetchData(); // Refresh allocations after save
      setStep(2);
    } catch (err) {
      console.error("SmartAllocatePage save failed:", err);
      alert("Failed to save allocations. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ──
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading school data…
      </div>
    );
  }

  const teachersUsed = new Set(activeProposed.map((p) => p.teacherId)).size;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Smart Auto-Allocate
            </h1>
            <p className="text-sm text-gray-500">
              Automatically fill unallocated periods based on teacher workload
            </p>
          </div>
        </div>
        <StepIndicator step={step} />
      </div>

      {/* ══ STEP 0: Generate ══ */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Zap size={38} className="text-indigo-500" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Generate a Smart Allocation Template
            </h2>
            <p className="text-sm text-gray-500 max-w-lg leading-relaxed">
              The algorithm scans all unallocated periods, ranks teachers by
              available capacity, and fills each cell — splitting across
              multiple teachers when needed. You review and edit everything
              before anything is saved.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
            {[
              { icon: BookOpen, label: "Subjects", value: subjects.length },
              { icon: Users, label: "Teachers", value: teachers.length },
              { icon: BarChart2, label: "Grades", value: grades.length },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="bg-gray-50 rounded-xl p-4 border border-gray-100"
              >
                <Icon size={20} className="text-indigo-400 mx-auto mb-1.5" />
                <div className="text-2xl font-bold text-gray-800">{value}</div>
                <div className="text-xs text-gray-400">{label}</div>
              </div>
            ))}
          </div>

          {/* Notice */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 text-left max-w-lg">
            <Info size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Only <strong>unallocated</strong> periods will be touched.
              Existing assignments are fully preserved. You can remove or adjust
              any suggestion before saving.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-10 py-3 rounded-xl shadow-md shadow-indigo-200 transition-all text-sm"
          >
            <Zap size={16} />
            Generate Template
          </button>
        </div>
      )}

      {/* ══ STEP 1: Review ══ */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {/* Summary Bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3 flex flex-wrap gap-6 text-xs">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <strong className="text-gray-800 text-sm">
                {activeProposed.length}
              </strong>{" "}
              assignments to add
            </span>
            <span className="flex items-center gap-2 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              <strong className="text-gray-800 text-sm">
                {removed.size}
              </strong>{" "}
              skipped
            </span>
            <span className="flex items-center gap-2 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <strong className="text-gray-800 text-sm">
                {conflicts.length}
              </strong>{" "}
              conflicts
            </span>
            <span className="flex items-center gap-2 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <strong className="text-gray-800 text-sm">
                {teachersUsed}
              </strong>{" "}
              teachers used
            </span>
          </div>

          {/* Proposed Table */}
          {proposed.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Proposed Assignments
                </h3>
                <span className="text-xs text-gray-400">
                  Toggle trash icon to skip a row · Edit periods inline
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left">Grade</th>
                      <th className="px-5 py-3 text-left">Subject</th>
                      <th className="px-5 py-3 text-left">Teacher</th>
                      <th className="px-5 py-3 text-left min-w-[130px]">
                        Workload After
                      </th>
                      <th className="px-5 py-3 text-center">Periods</th>
                      <th className="px-5 py-3 text-center">Skip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {proposed.map((alloc) => {
                      const isRemoved = removed.has(alloc.id);
                      const teacher = teachers.find(
                        (t) => t.id === alloc.teacherId,
                      );
                      const maxLoad = parseInt(teacher?.maxLoad) || 30;

                      const existingLoad = allocations
                        .filter((a) => a.teacherId === alloc.teacherId)
                        .reduce(
                          (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
                          0,
                        );

                      const proposedLoad = proposed
                        .filter(
                          (p) =>
                            p.teacherId === alloc.teacherId &&
                            !removed.has(p.id),
                        )
                        .reduce(
                          (sum, p) =>
                            sum +
                            (parseInt(
                              editingPeriods[p.id] ?? p.periodsPerWeek,
                            ) || 0),
                          0,
                        );

                      const totalLoad = existingLoad + proposedLoad;

                      return (
                        <tr
                          key={alloc.id}
                          className={`transition-all duration-200 ${
                            isRemoved
                              ? "bg-gray-50 opacity-40"
                              : "bg-white hover:bg-indigo-50/20"
                          }`}
                        >
                          <td className="px-5 py-3">
                            <span className="font-semibold text-gray-800 text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {alloc.gradeName}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs text-gray-700">
                              {alloc.subjectName}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-semibold text-gray-800">
                              {alloc.teacherName}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <LoadBar current={totalLoad} max={maxLoad} />
                          </td>
                          <td className="px-5 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              disabled={isRemoved}
                              value={
                                editingPeriods[alloc.id] !== undefined
                                  ? editingPeriods[alloc.id]
                                  : alloc.periodsPerWeek
                              }
                              onChange={(e) =>
                                setEditingPeriods((prev) => ({
                                  ...prev,
                                  [alloc.id]: e.target.value,
                                }))
                              }
                              className="w-14 h-7 text-xs font-bold text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none disabled:opacity-40 text-gray-800"
                            />
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button
                              onClick={() => toggleRemove(alloc.id)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                                isRemoved
                                  ? "bg-green-100 hover:bg-green-200 text-green-600"
                                  : "bg-red-50 hover:bg-red-100 text-red-400"
                              }`}
                              title={isRemoved ? "Restore row" : "Skip row"}
                            >
                              {isRemoved ? (
                                <RotateCcw size={12} />
                              ) : (
                                <Trash2 size={12} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm py-12 text-center">
              <CheckCircle2 size={32} className="mx-auto text-green-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">
                All periods are already allocated!
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Nothing new to suggest.
              </p>
            </div>
          )}

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                <h3 className="text-sm font-bold text-amber-700">
                  Unresolvable Cells ({conflicts.length})
                </h3>
                <span className="text-xs text-amber-500 ml-auto">
                  These need manual assignment
                </span>
              </div>
              <div className="divide-y divide-amber-50">
                {conflicts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div>
                      <span className="text-sm font-semibold text-gray-800">
                        {c.grade.name}{" "}
                        <span className="text-gray-400 font-normal">—</span>{" "}
                        {c.subject.name}
                      </span>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {c.reason}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                      {c.needed}p needed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 pb-6">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RotateCcw size={14} />
              Start Over
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {activeProposed.length} of {proposed.length} assignments
                selected
              </span>
              <button
                onClick={handleSave}
                disabled={saving || activeProposed.length === 0}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-7 py-2.5 rounded-xl text-sm shadow-md shadow-indigo-100 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    Save {activeProposed.length} Assignment
                    {activeProposed.length !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 2: Done ══ */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={42} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Allocations Saved!
            </h2>
            <p className="text-sm text-gray-500">
              {activeProposed.length} assignment
              {activeProposed.length !== 1 ? "s" : ""} have been added to the
              matrix.
            </p>
          </div>

          {conflicts.length > 0 && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700 max-w-md">
              <AlertTriangle size={15} className="shrink-0" />
              {conflicts.length} cell{conflicts.length > 1 ? "s" : ""} still
              need manual assignment in the Allocations tab.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <RotateCcw size={14} />
              Run Again
            </button>
            <button
              onClick={() =>
                navigate("../../allocations", { relative: "path" })
              }
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              View Allocations
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartAllocatePage;
