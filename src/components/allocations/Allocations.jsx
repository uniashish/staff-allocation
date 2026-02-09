import React, { useState, useEffect } from "react";
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
import { Plus, X, AlertCircle, Clock } from "lucide-react";
import TeacherDetailModal from "../teachers/TeacherDetailModal";

const Allocations = () => {
  const { school } = useOutletContext();
  const { currentUser } = useAuth();

  // Data State
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeCell, setActiveCell] = useState(null); // { gradeId, subjectId }
  const [assignPeriods, setAssignPeriods] = useState(1);
  const [viewingTeacher, setViewingTeacher] = useState(null);

  const canEdit = currentUser?.role === "super_admin";

  // 1. Fetch All Data
  const fetchData = async () => {
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
    } catch (error) {
      console.error("Error fetching allocation data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id]);

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
      // Check if subject is taught in this grade
      const detail = subject.gradeDetails?.find((g) => g.id === gradeId);
      if (detail) {
        const required = parseInt(detail.periods) || 0;
        totalRequired += required;

        // Count allocated for this subject/grade
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

  const getQualifiedTeachers = (subjectId, existingTeacherIds = []) => {
    return teachers.filter(
      (t) =>
        t.subjectIds &&
        t.subjectIds.includes(subjectId) &&
        !existingTeacherIds.includes(t.id),
    );
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
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Teaching Allocations
        </h2>
        <p className="text-sm text-gray-600">Assign teachers to subjects.</p>
      </div>

      {/* MATRIX TABLE */}
      {/* Removed table-fixed to allow natural expansion */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-auto shadow-sm relative w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
            <tr>
              {/* Class Column */}
              <th className="px-3 py-3 text-left text-sm font-bold text-gray-900 uppercase tracking-wider sticky left-0 bg-gray-100 z-30 min-w-[180px] border-r border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Class Stats
              </th>
              {subjects.map((subject) => (
                <th
                  key={subject.id}
                  // Increased min-width for better screen usage
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
                  {/* Fixed Class Column */}
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

                  {/* Subject Cells */}
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
                          {/* 1. ASSIGNED TEACHERS */}
                          {cellAllocations.map((allocation) => (
                            <div
                              key={allocation.id}
                              className="flex items-center justify-between gap-1 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 group"
                            >
                              <div className="overflow-hidden w-full">
                                <button
                                  onClick={() => {
                                    const t = teachers.find(
                                      (tea) => tea.id === allocation.teacherId,
                                    );
                                    if (t) setViewingTeacher(t);
                                  }}
                                  className="text-xs font-bold text-indigo-900 hover:underline truncate w-full text-left focus:outline-none block leading-tight"
                                  title={`${allocation.teacherName} (${allocation.periodsPerWeek} p/w)`}
                                >
                                  {allocation.teacherName}
                                </button>
                              </div>
                              <span className="text-xs text-indigo-800 font-mono font-bold shrink-0">
                                {allocation.periodsPerWeek}
                              </span>
                              {canEdit && (
                                <button
                                  onClick={() =>
                                    handleRemoveAllocation(allocation.id)
                                  }
                                  className="text-indigo-400 hover:text-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-0.5"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          ))}

                          {/* 2. ADD BUTTON */}
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
                                // 3. DROPDOWN
                                <div className="absolute top-0 left-0 w-[220px] z-50">
                                  <div className="bg-white border border-gray-300 shadow-xl rounded-lg p-3 text-left ring-1 ring-black ring-opacity-5">
                                    <div className="text-xs font-bold text-gray-700 mb-2 px-1 uppercase tracking-wider">
                                      Add Teacher ({remaining} left)
                                    </div>

                                    <div className="flex items-center gap-2 mb-2 bg-blue-50 p-1.5 rounded border border-blue-200">
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

                                    <div className="max-h-40 overflow-y-auto space-y-0.5 my-1">
                                      {getQualifiedTeachers(
                                        subject.id,
                                        cellAllocations.map((a) => a.teacherId),
                                      ).length > 0 ? (
                                        getQualifiedTeachers(
                                          subject.id,
                                          cellAllocations.map(
                                            (a) => a.teacherId,
                                          ),
                                        ).map((teacher) => (
                                          <button
                                            key={teacher.id}
                                            onClick={() =>
                                              handleAllocate(
                                                grade,
                                                subject,
                                                teacher.id,
                                              )
                                            }
                                            className="w-full text-left px-2 py-1.5 text-xs font-medium text-gray-900 hover:bg-blue-100 hover:text-blue-900 rounded transition-colors truncate"
                                          >
                                            {teacher.name}
                                          </button>
                                        ))
                                      ) : (
                                        <div className="px-2 py-1 text-xs font-medium text-red-600 italic flex items-center gap-1">
                                          <AlertCircle size={12} /> No teachers
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => setActiveCell(null)}
                                      className="w-full mt-2 border-t border-gray-200 text-xs font-bold text-gray-500 py-1.5 hover:text-gray-800 hover:bg-gray-50 rounded"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <div
                                    className="fixed inset-0 z-[-1]"
                                    onClick={() => setActiveCell(null)}
                                  ></div>
                                </div>
                              )}
                            </div>
                          ) : // REMOVED "MAX REACHED" LABEL AS REQUESTED
                          null}
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
    </div>
  );
};

export default Allocations;
