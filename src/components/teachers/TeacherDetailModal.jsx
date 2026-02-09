import React, { useMemo } from "react";
import { X, User, BookOpen, Building2, Clock, Calendar } from "lucide-react";

const TeacherDetailModal = ({ isOpen, onClose, teacher, allocations = [] }) => {
  if (!isOpen || !teacher) return null;

  // Derive workload statistics from active allocations
  const workload = useMemo(() => {
    // 1. Filter allocations for this specific teacher
    const myAllocations = allocations.filter((a) => a.teacherId === teacher.id);

    // 2. Calculate Stats
    // Ensure we parse the periods as integers to avoid concatenation errors
    const totalPeriods = myAllocations.reduce(
      (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
      0,
    );

    // Count unique Classes (Grades)
    const uniqueClasses = new Set(myAllocations.map((a) => a.gradeName)).size;

    // Count unique Subjects
    const uniqueSubjects = new Set(myAllocations.map((a) => a.subjectName))
      .size;

    return {
      active: myAllocations,
      totalPeriods,
      uniqueClasses,
      uniqueSubjects,
    };
  }, [teacher, allocations]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {teacher.name}
              </h2>
              <p className="text-sm text-gray-500">
                Workload & Schedule Profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full hover:bg-gray-100 border border-transparent hover:border-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Workload Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-orange-600" />
                <p className="text-xs text-orange-600 font-semibold uppercase">
                  Total Periods
                </p>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {workload.totalPeriods}
              </p>
              <p className="text-xs text-orange-400">per week</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={16} className="text-blue-600" />
                <p className="text-xs text-blue-600 font-semibold uppercase">
                  Classes
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {workload.uniqueClasses}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={16} className="text-purple-600" />
                <p className="text-xs text-purple-600 font-semibold uppercase">
                  Subjects
                </p>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {workload.uniqueSubjects}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100"></div>

          {/* Allocation Details Table */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-gray-400" size={18} />
              <h3 className="font-semibold text-gray-900">
                Active Teaching Assignments
              </h3>
            </div>

            {workload.active.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Periods/Week
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {workload.active.map((alloc) => (
                      <tr
                        key={alloc.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {alloc.gradeName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {alloc.subjectName}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600 text-right">
                          {alloc.periodsPerWeek}
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-gray-50 font-semibold">
                      <td
                        colSpan="2"
                        className="px-4 py-2 text-sm text-gray-900 text-right"
                      >
                        Total Weekly Load:
                      </td>
                      <td className="px-4 py-2 text-sm text-indigo-700 text-right">
                        {workload.totalPeriods}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-sm">
                  This teacher has not been allocated to any classes yet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherDetailModal;
