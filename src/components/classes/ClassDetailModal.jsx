import React, { useMemo } from "react";
import {
  X,
  Layers,
  User,
  BookOpen,
  Clock,
  Users,
  AlertCircle,
} from "lucide-react";

const ClassDetailModal = ({
  isOpen,
  onClose,
  grade,
  teachers,
  subjects,
  allocations = [],
}) => {
  if (!isOpen || !grade) return null;

  // 1. Calculate Summary Stats & Row Data
  const { classData, summary } = useMemo(() => {
    const data = [];
    let totalAllocatedPeriods = 0;
    let totalRequiredPeriods = 0;

    // Find all subjects taught in this grade
    const subjectsInGrade = subjects.filter(
      (s) => s.gradeIds && s.gradeIds.includes(grade.id),
    );

    subjectsInGrade.forEach((subject) => {
      // Get curriculum requirement for this subject/grade
      const gradeDetail = subject.gradeDetails?.find((d) => d.id === grade.id);
      const required = parseInt(gradeDetail?.periods || 0);
      totalRequiredPeriods += required;

      // Get ALL allocations for this subject/grade (could be multiple teachers)
      const subjectAllocations = allocations.filter(
        (a) => a.gradeId === grade.id && a.subjectId === subject.id,
      );

      const allocatedCount = subjectAllocations.reduce(
        (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
        0,
      );
      totalAllocatedPeriods += allocatedCount;

      const unallocatedCount = Math.max(0, required - allocatedCount);

      // Identify teachers actually assigned
      if (subjectAllocations.length > 0) {
        subjectAllocations.forEach((allocation) => {
          data.push({
            subjectName: subject.name,
            teacherName: allocation.teacherName,
            teacherId: allocation.teacherId,
            department: subject.departmentName || "General",
            periods: allocation.periodsPerWeek,
            subjectAllocated: allocatedCount,
            subjectRequired: required,
            subjectUnallocated: unallocatedCount,
          });
        });
      } else {
        // Unassigned Subject Row
        data.push({
          subjectName: subject.name,
          teacherName: "Not Assigned",
          department: subject.departmentName || "General",
          isUnassigned: true,
          periods: 0,
          subjectAllocated: 0,
          subjectRequired: required,
          subjectUnallocated: required,
        });
      }
    });

    return {
      classData: data,
      summary: {
        totalSubjects: subjectsInGrade.length,
        totalAllocated: totalAllocatedPeriods,
        totalUnallocated: totalRequiredPeriods - totalAllocatedPeriods,
        // FIX: Check both possible field names for robustness
        totalStudents: grade.totalStudents || grade.studentCount || 0,
        sections: grade.sectionCount || 1,
      },
    };
  }, [grade, teachers, subjects, allocations]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-auto overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Layers className="text-blue-600" size={24} />
                {grade.name}{" "}
                <span className="text-gray-400 text-base font-normal">
                  Overview
                </span>
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={24} />
            </button>
          </div>

          {/* SUMMARY STATISTICS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Students/Sections */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                <Users size={12} /> Students
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold text-gray-900">
                  {summary.totalStudents}
                </span>
                <span className="text-xs text-gray-400">
                  ({summary.sections} secs)
                </span>
              </div>
            </div>

            {/* Total Subjects */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                <BookOpen size={12} /> Subjects
              </span>
              <span className="text-lg font-bold text-gray-900 mt-1">
                {summary.totalSubjects}
              </span>
            </div>

            {/* Allocated Periods */}
            <div className="bg-white p-3 rounded-lg border border-green-200 shadow-sm flex flex-col">
              <span className="text-xs text-green-600 font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} /> Allocated
              </span>
              <span className="text-lg font-bold text-green-700 mt-1">
                {summary.totalAllocated}{" "}
                <span className="text-xs font-normal text-green-600">
                  periods
                </span>
              </span>
            </div>

            {/* Unallocated Periods */}
            <div
              className={`p-3 rounded-lg border shadow-sm flex flex-col ${summary.totalUnallocated > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${summary.totalUnallocated > 0 ? "text-red-600" : "text-gray-500"}`}
              >
                <AlertCircle size={12} /> Unallocated
              </span>
              <span
                className={`text-lg font-bold mt-1 ${summary.totalUnallocated > 0 ? "text-red-700" : "text-gray-900"}`}
              >
                {summary.totalUnallocated}{" "}
                <span
                  className={`text-xs font-normal ${summary.totalUnallocated > 0 ? "text-red-600" : "text-gray-400"}`}
                >
                  periods
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-0">
          {classData.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    Subject & Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    Teacher Assignment
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    Department
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    {/* Subject Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <BookOpen size={16} className="text-blue-500" />
                          {row.subjectName}
                        </div>
                        {/* Subject Level Stats */}
                        <div className="text-xs flex items-center gap-2 mt-1 ml-6">
                          <span className="text-gray-500">
                            Req: {row.subjectRequired}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span
                            className={`${row.subjectUnallocated === 0 ? "text-green-600 font-medium" : "text-gray-500"}`}
                          >
                            Alloc: {row.subjectAllocated}
                          </span>
                          {row.subjectUnallocated > 0 && (
                            <span className="text-red-500 font-bold bg-red-50 px-1.5 rounded">
                              Left: {row.subjectUnallocated}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Teacher Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {row.isUnassigned ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Unassigned
                        </span>
                      ) : (
                        <div className="flex items-center">
                          {/* Teacher Periods Badge (In Front) */}
                          <div
                            className="mr-3 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1 min-w-[50px] justify-center"
                            title="Periods assigned to this teacher for this class"
                          >
                            <Clock size={10} />
                            {row.periods}
                          </div>

                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {row.teacherName}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Department Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {row.department}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 italic">
                No data available for this class.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassDetailModal;
