import React, { useMemo } from "react";
import { X, User, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";

const SubjectDetailModal = ({
  isOpen,
  onClose,
  subject,
  allocations,
  teachers,
}) => {
  if (!isOpen || !subject) return null;

  // Helper to safely get periods (handling both field names)
  const getPeriods = (a) => parseInt(a.periods || a.periodsPerWeek || 0);

  // Calculate detailed stats per class (grade)
  const classStats = useMemo(() => {
    const grades = subject.gradeDetails || [];

    return grades.map((grade) => {
      // Find allocations for this specific subject & grade
      const gradeAllocations = allocations.filter(
        (a) => a.subjectId === subject.id && a.gradeId === grade.id,
      );

      // Sum allocated periods using safe helper
      const allocated = gradeAllocations.reduce(
        (sum, a) => sum + getPeriods(a),
        0,
      );

      const required = parseInt(grade.periods) || 0;
      const unallocated = required - allocated;

      // Map assigned teachers
      const assignedTeachers = gradeAllocations.map((a) => {
        const teacher = teachers.find((t) => t.id === a.teacherId);
        return {
          id: a.teacherId,
          name: teacher ? teacher.name : "Unknown Teacher",
          periods: getPeriods(a),
        };
      });

      return {
        id: grade.id,
        name: grade.name,
        required,
        allocated,
        unallocated,
        teachers: assignedTeachers,
      };
    });
  }, [subject, allocations, teachers]);

  const totalRequired = classStats.reduce((sum, c) => sum + c.required, 0);
  const totalAllocated = classStats.reduce((sum, c) => sum + c.allocated, 0);
  const totalUnallocated = totalRequired - totalAllocated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gray-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="text-blue-600" size={20} />
              <h3 className="text-xl font-bold text-gray-800">
                {subject.name}
              </h3>
            </div>
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">
              {subject.departmentName || "No Department"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 p-6 bg-white border-b border-gray-100">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
              Total Required
            </p>
            <p className="text-2xl font-black text-blue-700">{totalRequired}</p>
          </div>
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
              Allocated
            </p>
            <p className="text-2xl font-black text-purple-700">
              {totalAllocated}
            </p>
          </div>
          <div
            className={`p-4 rounded-xl border ${totalUnallocated < 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}
          >
            <p
              className={`text-xs font-bold uppercase tracking-wider mb-1 ${totalUnallocated < 0 ? "text-red-400" : "text-gray-400"}`}
            >
              {totalUnallocated < 0 ? "Over Allocated" : "Unallocated"}
            </p>
            <p
              className={`text-2xl font-black ${totalUnallocated < 0 ? "text-red-700" : "text-gray-700"}`}
            >
              {Math.abs(totalUnallocated)}
            </p>
          </div>
        </div>

        {/* Main Table */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
          {classStats.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No classes configured for this subject.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                      Required
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                      Allocated
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Teachers Assigned
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {classStats.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-4 font-bold text-gray-700">
                        {row.name}
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-gray-600">
                        {row.required}
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-indigo-600">
                        {row.allocated}
                      </td>

                      {/* Status Column */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            row.unallocated === 0
                              ? "bg-green-100 text-green-700"
                              : row.unallocated < 0
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {row.unallocated === 0 ? (
                            <CheckCircle size={12} className="mr-1" />
                          ) : null}
                          {row.unallocated === 0
                            ? "Complete"
                            : row.unallocated < 0
                              ? "Over"
                              : `${row.unallocated} Left`}
                        </span>
                      </td>

                      {/* Teachers Column */}
                      <td className="px-5 py-4">
                        {row.teachers.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.teachers.map((t, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm"
                              >
                                <div className="p-1 bg-indigo-50 rounded-full text-indigo-600">
                                  <User size={10} />
                                </div>
                                <span className="font-medium">{t.name}</span>
                                <span className="text-xs text-gray-400 px-1 border-l border-gray-200">
                                  {t.periods} pds
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic flex items-center gap-1">
                            <AlertCircle size={12} /> Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubjectDetailModal;
