import React, { useMemo } from "react";
import {
  X,
  User,
  BookOpen,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const DepartmentDetailModal = ({
  isOpen,
  onClose,
  department,
  teachers,
  subjects,
  allocations = [],
  grades = [],
}) => {
  if (!isOpen || !department) return null;

  // 1. Process Data
  const { deptTeachers, deptSubjects, stats } = useMemo(() => {
    // A. Filter Teachers & Calculate their Load for THIS department
    const relevantTeachers = teachers
      .filter((t) => t.departmentIds && t.departmentIds.includes(department.id))
      .map((t) => {
        const deptSubjectIds = subjects
          .filter((s) => s.departmentId === department.id)
          .map((s) => s.id);

        // Calculate load specifically for this department's subjects
        const deptLoad = allocations
          .filter(
            (a) => a.teacherId === t.id && deptSubjectIds.includes(a.subjectId),
          )
          .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

        // Calculate Total Load (across ALL departments) for the progress bar context
        const totalLoad = allocations
          .filter((a) => a.teacherId === t.id)
          .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

        return { ...t, deptLoad, totalLoad };
      });

    // B. Filter Subjects & Calculate Status
    const relevantSubjects = subjects
      .filter((s) => s.departmentId === department.id)
      .map((s) => {
        let req = 0;
        let alloc = 0;

        if (s.gradeDetails) {
          req = s.gradeDetails.reduce(
            (sum, g) => sum + (parseInt(g.periods) || 0),
            0,
          );
        }

        alloc = allocations
          .filter((a) => a.subjectId === s.id)
          .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

        return { ...s, req, alloc };
      });

    const totalReq = relevantSubjects.reduce((sum, s) => sum + s.req, 0);
    const totalAlloc = relevantSubjects.reduce((sum, s) => sum + s.alloc, 0);

    return {
      deptTeachers: relevantTeachers,
      deptSubjects: relevantSubjects,
      stats: { totalReq, totalAlloc },
    };
  }, [department, teachers, subjects, allocations]);

  // Helper for Progress Bar Style
  const getTeacherProgressStyle = (load, max) => {
    const maxLoad = parseInt(max) || 30;
    const percentage = Math.min((load / maxLoad) * 100, 100);
    // Green for allocated, Red for remaining space
    return {
      background: `linear-gradient(90deg, #dcfce7 ${percentage}%, #fee2e2 ${percentage}%)`,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-blue-600">
              <Building2 size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {department.name}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-gray-200">
                  <Clock size={14} className="text-blue-500" />
                  <span className="font-bold text-gray-900">
                    {stats.totalAlloc}
                  </span>{" "}
                  / {stats.totalReq} periods
                </span>
                <span>{deptTeachers.length} Teachers</span>
                <span>{deptSubjects.length} Subjects</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Two Columns */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Teachers (Updated with Progress Bar) */}
          <div className="flex-1 overflow-y-auto border-r border-gray-100 p-6 bg-white">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={16} /> Faculty Members
            </h3>

            <div className="space-y-3">
              {deptTeachers.length > 0 ? (
                deptTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    style={getTeacherProgressStyle(
                      teacher.totalLoad,
                      teacher.maxLoad,
                    )}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 shadow-sm transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {teacher.name}
                        </p>
                        <p className="text-xs text-gray-600 font-medium">
                          {teacher.deptLoad} periods (Dept)
                        </p>
                      </div>
                    </div>
                    <div className="text-right relative z-10">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-0.5">
                        Total Load
                      </span>
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded bg-white border border-gray-200 shadow-sm ${
                          teacher.maxLoad && teacher.totalLoad > teacher.maxLoad
                            ? "text-red-600"
                            : "text-green-700"
                        }`}
                      >
                        {teacher.totalLoad} / {teacher.maxLoad || 30}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No teachers assigned.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Subjects & Classes */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen size={16} /> Subjects & Allocation
            </h3>

            <div className="space-y-4">
              {deptSubjects.length > 0 ? (
                deptSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-900">
                        {subject.name}
                      </h4>
                      <div
                        className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${
                          subject.alloc === subject.req
                            ? "bg-green-100 text-green-700"
                            : subject.alloc > subject.req
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {subject.alloc === subject.req ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertCircle size={12} />
                        )}
                        {subject.alloc} / {subject.req}
                      </div>
                    </div>

                    {/* Grade Breakdown with Teachers */}
                    <div className="space-y-2">
                      {subject.gradeDetails &&
                      subject.gradeDetails.length > 0 ? (
                        subject.gradeDetails.map((detail, idx) => {
                          // 1. Find Grade Name
                          const gradeName =
                            grades.find((g) => g.id === detail.id)?.name ||
                            "Unknown Class";

                          // 2. Find Allocations for this specific Class+Subject
                          const gradeAllocations = allocations.filter(
                            (a) =>
                              a.subjectId === subject.id &&
                              a.gradeId === detail.id,
                          );

                          // 3. Calculate total periods assigned
                          const gradeAllocCount = gradeAllocations.reduce(
                            (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
                            0,
                          );

                          // 4. Get Unique Teacher Names
                          const assignedTeachers = [
                            ...new Set(
                              gradeAllocations.map((a) => a.teacherName),
                            ),
                          ];

                          const isComplete =
                            gradeAllocCount >= parseInt(detail.periods);

                          return (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50 last:border-0"
                            >
                              {/* Left: Class Name */}
                              <span className="font-semibold text-gray-700 min-w-[80px]">
                                {gradeName}
                              </span>

                              {/* Middle: Teacher Name */}
                              <div className="flex-1 px-3 text-left">
                                {assignedTeachers.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {assignedTeachers.map((name, tIdx) => (
                                      <span
                                        key={tIdx}
                                        className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] border border-blue-100"
                                      >
                                        <User size={8} /> {name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">
                                    Unassigned
                                  </span>
                                )}
                              </div>

                              {/* Right: Period Count */}
                              <span
                                className={`${isComplete ? "text-green-600 font-bold" : "text-red-500 font-medium"}`}
                              >
                                {gradeAllocCount} / {detail.periods}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-gray-400">
                          No classes assigned.
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No subjects found.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetailModal;
