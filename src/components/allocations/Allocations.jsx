import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseUtils";
import { useAuth } from "../../context/AuthContext";
import {
  Plus,
  X,
  AlertCircle,
  Clock,
  BarChart3,
  Star,
  AlertTriangle,
  Layers,
} from "lucide-react";
import TeacherDetailModal from "../teachers/TeacherDetailModal";
import TeacherLoadMatrix from "./TeacherLoadMatrix";
import AllocationChat from "./chat";

const Allocations = () => {
  const { school } = useOutletContext();
  const { currentUser } = useAuth();

  // Data State
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeCell, setActiveCell] = useState(null);
  const [assignPeriods, setAssignPeriods] = useState(1);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const canEdit = currentUser?.role === "super_admin";

  // 1. Fetch All Data
  const fetchData = async () => {
    try {
      const [gradeSnap, subjSnap, teachSnap, allocSnap, deptSnap] =
        await Promise.all([
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
          getDocs(collection(db, "schools", school.id, "departments")),
        ]);

      setGrades(gradeSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSubjects(subjSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTeachers(teachSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAllocations(allocSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDepartments(deptSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching allocation data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id]);

  // Helper: Get Teacher Stats for Heatmap
  const getTeacherStats = (teacherId) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher)
      return {
        colorClass: "bg-gray-100 border-gray-200 text-gray-800",
        load: 0,
        max: 30,
      };

    const maxLoad = parseInt(teacher.maxLoad) || 30;
    const currentLoad = allocations
      .filter((a) => a.teacherId === teacherId)
      .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

    const utilization = (currentLoad / maxLoad) * 100;

    let colorClass = "bg-indigo-50 border-indigo-200 text-indigo-900";

    if (showHeatmap) {
      if (utilization > 90) {
        colorClass = "bg-red-100 border-red-300 text-red-800";
      } else if (utilization >= 70) {
        colorClass = "bg-green-100 border-green-300 text-green-800";
      } else {
        colorClass = "bg-blue-100 border-blue-300 text-blue-800";
      }
    }

    return { colorClass, load: currentLoad, max: maxLoad };
  };

  const getTeacherLoad = (teacherId) => {
    return allocations
      .filter((a) => a.teacherId === teacherId)
      .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);
  };

  // Helper: Get cell constraints and current status
  const getCellStatus = (gradeId, subjectId) => {
    const subject = subjects.find((s) => s.id === subjectId);
    const detail = subject?.gradeDetails?.find((g) => g.id === gradeId);
    const maxPeriods = detail ? parseInt(detail.periods) : 0;

    const cellAllocations = allocations.filter(
      (a) => a.gradeId === gradeId && a.subjectId === subject.id,
    );

    const assignedTotal = cellAllocations.reduce(
      (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
      0,
    );

    const remaining = maxPeriods - assignedTotal;

    return { maxPeriods, assignedTotal, remaining, cellAllocations };
  };

  // Helper: Calculate Total Grade Stats
  const getGradeStats = (gradeId) => {
    let totalRequired = 0;
    let totalAllocated = 0;

    subjects.forEach((subject) => {
      const detail = subject.gradeDetails?.find((g) => g.id === gradeId);
      if (detail) {
        const required = parseInt(detail.periods) || 0;
        totalRequired += required;

        const cellAllocations = allocations.filter(
          (a) => a.gradeId === gradeId && a.subjectId === subject.id,
        );
        const allocated = cellAllocations.reduce(
          (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
          0,
        );
        totalAllocated += allocated;
      }
    });

    return {
      totalRequired,
      totalAllocated,
      unallocated: totalRequired - totalAllocated,
    };
  };

  // --- SMART SUGGEST LOGIC ---
  const getSmartSuggestions = (subjectId, gradeId, existingTeacherIds = []) => {
    const qualified = teachers.filter(
      (t) =>
        t.subjectIds &&
        t.subjectIds.includes(subjectId) &&
        !existingTeacherIds.includes(t.id),
    );

    if (qualified.length === 0) return [];

    const scoredTeachers = qualified
      .map((teacher) => {
        const maxLoad = parseInt(teacher.maxLoad) || 30;
        const currentLoad = allocations
          .filter((a) => a.teacherId === teacher.id)
          .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

        const utilization = (currentLoad / maxLoad) * 100;
        const available = maxLoad - currentLoad;

        if (available <= 0) return null;

        const teachesGrade = allocations.some(
          (a) =>
            a.teacherId === teacher.id &&
            a.gradeId === gradeId &&
            a.subjectId !== subjectId,
        );

        let status = "good";
        if (utilization > 90) status = "warning";

        let score = ((maxLoad - currentLoad) / maxLoad) * 100;
        if (status === "warning") score -= 40;
        if (teachesGrade) score += 20;

        return {
          ...teacher,
          currentLoad,
          maxLoad,
          available,
          teachesGrade,
          status,
          score,
        };
      })
      .filter(Boolean);

    return scoredTeachers.sort((a, b) => b.score - a.score);
  };

  // 2. Assignment Logic
  const handleAllocate = async (grade, subject, teacherId) => {
    try {
      const { remaining } = getCellStatus(grade.id, subject.id);
      const periodsToAssign = parseInt(assignPeriods);

      if (periodsToAssign <= 0) {
        alert("Periods must be greater than 0.");
        return;
      }
      if (periodsToAssign > remaining) {
        alert(
          `Cannot assign ${periodsToAssign} periods. Only ${remaining} periods remaining.`,
        );
        return;
      }

      const teacher = teachers.find((t) => t.id === teacherId);
      if (!teacher) return;

      const currentLoad = getTeacherLoad(teacherId);
      const maxLoad = parseInt(teacher.maxLoad) || 30;

      if (currentLoad + periodsToAssign > maxLoad) {
        alert(
          `Cannot assign ${periodsToAssign} periods to ${teacher.name}. This would exceed their maximum load of ${maxLoad} periods.`,
        );
        return;
      }

      const allocationId = `${grade.id}_${subject.id}_${teacher.id}`;
      const docRef = doc(db, "schools", school.id, "allocations", allocationId);

      const newAllocation = {
        gradeId: grade.id,
        gradeName: grade.name,
        subjectId: subject.id,
        subjectName: subject.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        periodsPerWeek: periodsToAssign,
        updatedAt: new Date(),
      };

      await setDoc(docRef, newAllocation);

      setAllocations((prev) => [
        ...prev.filter((a) => a.id !== allocationId),
        { id: allocationId, ...newAllocation },
      ]);
      setActiveCell(null);
      setAssignPeriods(1);
    } catch (error) {
      console.error("Allocation failed:", error);
      alert("Failed to allocate teacher");
    }
  };

  const handleRemoveAllocation = async (allocationId) => {
    if (!window.confirm("Remove this teacher assignment?")) return;
    try {
      await deleteDoc(
        doc(db, "schools", school.id, "allocations", allocationId),
      );
      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
    } catch (error) {
      console.error("Remove failed:", error);
    }
  };

  const openAssignmentDropdown = (gradeId, subjectId, remaining) => {
    if (!canEdit) return;
    setActiveCell({ gradeId, subjectId });
    setAssignPeriods(remaining);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">Loading matrix...</div>
    );

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Teaching Allocations
          </h2>
          <p className="text-sm text-gray-600">Assign teachers to subjects.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-all text-sm font-medium border ${
              showHeatmap
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Layers size={18} />
            {showHeatmap ? "Heatmap On" : "Heatmap Off"}
          </button>

          <button
            onClick={() => setIsMatrixOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium"
          >
            <BarChart3 size={18} />
            View Loads
          </button>
        </div>
      </div>

      {/* Heatmap Legend */}
      {showHeatmap && (
        <div className="flex items-center gap-4 mb-3 text-xs px-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span>
            <span className="text-gray-600">Underutilized (&lt;70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
            <span className="text-gray-600">Optimal (70-90%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
            <span className="text-gray-600">Overloaded (&gt;90%)</span>
          </div>
        </div>
      )}

      {/* MATRIX TABLE */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-auto shadow-sm relative w-full h-[70vh] min-h-[70vh]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider sticky left-0 bg-gray-100 z-30 min-w-[180px] border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Class Stats
              </th>
              {subjects.map((subject) => (
                <th
                  key={subject.id}
                  className="px-2 py-3 text-center text-sm font-bold text-gray-900 uppercase tracking-wider min-w-[180px] border-r border-gray-200 last:border-0"
                  title={subject.name}
                >
                  <div className="px-1">{subject.name}</div>
                  <div className="text-[10px] font-semibold text-gray-600 normal-case truncate">
                    {subject.departmentName?.substring(0, 18)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {grades.map((grade) => {
              const stats = getGradeStats(grade.id);
              return (
                <tr
                  key={grade.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-3 py-3 sticky left-0 bg-white z-10 border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="text-base font-bold text-gray-900">
                      {grade.name}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <div className="text-xs font-medium text-gray-700">
                        Allocated:{" "}
                        <span className="text-green-700 font-bold">
                          {stats.totalAllocated}
                        </span>{" "}
                        / {stats.totalRequired}
                      </div>
                      <div className="text-xs font-medium text-gray-700">
                        Unallocated:{" "}
                        <span className="text-red-600 font-bold">
                          {stats.unallocated}
                        </span>
                      </div>
                    </div>
                  </td>

                  {subjects.map((subject) => {
                    const isTaught =
                      subject.gradeIds && subject.gradeIds.includes(grade.id);
                    const { remaining, cellAllocations } = getCellStatus(
                      grade.id,
                      subject.id,
                    );
                    const isActive =
                      activeCell?.gradeId === grade.id &&
                      activeCell?.subjectId === subject.id;

                    if (!isTaught) {
                      return (
                        <td
                          key={subject.id}
                          className="bg-gray-50 border-r border-gray-100 p-2 text-center last:border-0"
                        >
                          <span className="text-gray-300 text-xs">-</span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={subject.id}
                        className="p-2 align-top relative border-r border-gray-200 last:border-0"
                      >
                        <div className="flex flex-col gap-1 min-h-[40px]">
                          {cellAllocations.map((allocation) => {
                            const { colorClass } = getTeacherStats(
                              allocation.teacherId,
                            );
                            return (
                              <div
                                key={allocation.id}
                                className={`flex items-center justify-between gap-1 border rounded px-2 py-1 group transition-colors duration-300 ${colorClass}`}
                              >
                                <div className="overflow-hidden w-full">
                                  <button
                                    onClick={() => {
                                      const t = teachers.find(
                                        (tea) =>
                                          tea.id === allocation.teacherId,
                                      );
                                      if (t) setViewingTeacher(t);
                                    }}
                                    className="text-xs font-bold hover:underline truncate w-full text-left focus:outline-none block leading-tight"
                                    title={`${allocation.teacherName} (${allocation.periodsPerWeek} p/w)`}
                                  >
                                    {allocation.teacherName}
                                  </button>
                                </div>
                                <span className="text-xs font-mono font-bold shrink-0 opacity-80">
                                  {allocation.periodsPerWeek}
                                </span>
                                {canEdit && (
                                  <button
                                    onClick={() =>
                                      handleRemoveAllocation(allocation.id)
                                    }
                                    className="hover:text-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-0.5"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {remaining > 0 ? (
                            <div className="relative mt-0.5">
                              {!isActive ? (
                                <button
                                  onClick={() =>
                                    openAssignmentDropdown(
                                      grade.id,
                                      subject.id,
                                      remaining,
                                    )
                                  }
                                  disabled={!canEdit}
                                  className={`w-full py-1 border border-dashed rounded text-xs font-medium flex items-center justify-center gap-1 transition-all
                                  ${
                                    cellAllocations.length > 0
                                      ? "border-green-400 text-green-700 bg-green-50 hover:bg-green-100"
                                      : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                                  } disabled:opacity-50`}
                                >
                                  <Plus size={12} />
                                  {cellAllocations.length > 0
                                    ? remaining
                                    : "Assign"}
                                </button>
                              ) : (
                                <div className="absolute top-0 left-0 w-[280px] z-50">
                                  <div className="bg-white border border-gray-300 shadow-xl rounded-lg p-0 text-left ring-1 ring-black ring-opacity-5 overflow-hidden">
                                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Assign Teacher ({remaining} left)
                                      </span>
                                      <button
                                        onClick={() => setActiveCell(null)}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>

                                    <div className="p-3 border-b border-gray-100 bg-white">
                                      <div className="flex items-center gap-2 bg-blue-50 p-1.5 rounded border border-blue-200">
                                        <Clock
                                          size={14}
                                          className="text-blue-600"
                                        />
                                        <span className="text-xs text-blue-900 font-bold whitespace-nowrap">
                                          Periods:
                                        </span>
                                        <input
                                          type="number"
                                          min="1"
                                          max={remaining}
                                          value={assignPeriods}
                                          onChange={(e) =>
                                            setAssignPeriods(e.target.value)
                                          }
                                          className="w-12 h-6 text-xs font-bold text-center border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                        />
                                      </div>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto">
                                      {(() => {
                                        const suggestions = getSmartSuggestions(
                                          subject.id,
                                          grade.id,
                                          cellAllocations.map(
                                            (a) => a.teacherId,
                                          ),
                                        );

                                        if (suggestions.length === 0) {
                                          return (
                                            <div className="px-4 py-6 text-center">
                                              <AlertCircle
                                                size={20}
                                                className="mx-auto text-gray-300 mb-1"
                                              />
                                              <p className="text-xs font-medium text-gray-500 italic">
                                                No qualified teachers available.
                                              </p>
                                            </div>
                                          );
                                        }

                                        return suggestions.map((t) => (
                                          <button
                                            key={t.id}
                                            onClick={() =>
                                              handleAllocate(
                                                grade,
                                                subject,
                                                t.id,
                                              )
                                            }
                                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 group"
                                          >
                                            <div className="flex justify-between items-center mb-0.5">
                                              <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                                                {t.name}
                                              </span>
                                              {t.teachesGrade && (
                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded font-medium flex items-center gap-0.5">
                                                  <Star
                                                    size={8}
                                                    fill="currentColor"
                                                  />{" "}
                                                  Match
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                              <div className="flex items-center gap-1">
                                                <div
                                                  className={`w-1.5 h-1.5 rounded-full ${t.status === "warning" ? "bg-orange-400" : "bg-green-500"}`}
                                                />
                                                <span
                                                  className={`${t.status === "warning" ? "text-orange-600 font-bold" : "text-gray-500"}`}
                                                >
                                                  {t.currentLoad}/{t.maxLoad}{" "}
                                                  load
                                                </span>
                                              </div>
                                              {t.status === "warning" && (
                                                <AlertTriangle
                                                  size={12}
                                                  className="text-orange-500"
                                                />
                                              )}
                                            </div>
                                          </button>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                  <div
                                    className="fixed inset-0 z-[-1]"
                                    onClick={() => setActiveCell(null)}
                                  />
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TeacherDetailModal
        isOpen={!!viewingTeacher}
        onClose={() => setViewingTeacher(null)}
        teacher={viewingTeacher}
        allocations={allocations}
      />

      <TeacherLoadMatrix
        isOpen={isMatrixOpen}
        onClose={() => setIsMatrixOpen(false)}
        teachers={teachers}
        subjects={subjects}
        allocations={allocations}
      />

      {/* Allocation Assistant Chat */}
      <AllocationChat
        grades={grades}
        subjects={subjects}
        teachers={teachers}
        allocations={allocations}
        departments={departments}
      />
    </div>
  );
};

export default Allocations;
