import React, { useMemo } from "react";
import { X, Clock, AlertTriangle } from "lucide-react";

const TeacherLoadMatrix = ({
  isOpen,
  onClose,
  teachers,
  subjects,
  allocations,
}) => {
  if (!isOpen) return null;

  // Transform Data: Group by Teacher -> Subject
  const teacherRows = useMemo(() => {
    return teachers.map((teacher) => {
      let totalLoad = 0;

      // Build cells for each subject
      const subjectCells = subjects.map((subject) => {
        // Find allocations for this specific teacher and subject
        const matches = allocations.filter(
          (a) => a.teacherId === teacher.id && a.subjectId === subject.id,
        );

        // Sum periods for this cell
        const cellTotal = matches.reduce(
          (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
          0,
        );

        totalLoad += cellTotal;

        return {
          subjectId: subject.id,
          assignments: matches, // { gradeName, periodsPerWeek }
          cellTotal,
        };
      });

      return {
        ...teacher,
        cells: subjectCells,
        totalLoad,
      };
    });
  }, [teachers, subjects, allocations]);

  // Sort teachers: Highest workload first
  const sortedRows = useMemo(() => {
    return [...teacherRows].sort((a, b) => b.totalLoad - a.totalLoad);
  }, [teacherRows]);

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900 bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fixed top-[80px] left-1/2 transform -translate-x-1/2 z-50 bg-white w-[95vw] max-w-6xl rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ height: "calc(100vh - 100px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Teacher Workload Matrix
            </h2>
            <p className="text-sm text-gray-500">
              Overview of allocated periods per teacher across all subjects.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Table Container */}
        <div className="flex-1 overflow-auto relative">
          <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
            <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
              <tr>
                {/* Fixed Teacher Name Column */}
                <th className="sticky left-0 z-30 bg-gray-100 px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-300 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Teacher
                </th>

                {/* Subject Columns */}
                {subjects.map((subject) => (
                  <th
                    key={subject.id}
                    className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[140px] border-r border-gray-200"
                  >
                    <div className="truncate px-1" title={subject.name}>
                      {subject.name}
                    </div>
                  </th>
                ))}

                {/* Fixed Total Column */}
                <th className="sticky right-0 z-30 bg-gray-100 px-4 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-l border-gray-300 w-24 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Total Load
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedRows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  {/* Fixed Teacher Name Cell */}
                  <td className="sticky left-0 z-20 bg-white group-hover:bg-blue-50/30 px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="truncate">{row.name}</div>
                    {row.departmentNames && (
                      <div className="text-[10px] text-gray-400 truncate">
                        {row.departmentNames.join(", ")}
                      </div>
                    )}
                  </td>

                  {/* Subject Cells */}
                  {row.cells.map((cell) => (
                    <td
                      key={cell.subjectId}
                      className="px-2 py-2 border-r border-gray-100 align-top"
                    >
                      {cell.assignments.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {cell.assignments.map((assign, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center justify-between px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                            >
                              <span
                                className="truncate max-w-[80px] mr-1"
                                title={assign.gradeName}
                              >
                                {assign.gradeName}
                              </span>
                              <span className="font-bold bg-white px-1 rounded-sm text-[10px] shadow-sm">
                                {assign.periodsPerWeek}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-200 text-xs">
                          -
                        </div>
                      )}
                    </td>
                  ))}

                  {/* Fixed Total Cell */}
                  <td className="sticky right-0 z-20 bg-white group-hover:bg-blue-50/30 px-4 py-3 text-center border-l border-gray-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm
                        ${
                          row.totalLoad > 30
                            ? "bg-red-100 text-red-700"
                            : row.totalLoad === 0
                              ? "bg-gray-100 text-gray-400"
                              : "bg-green-100 text-green-700"
                        }
                    `}
                    >
                      {row.totalLoad > 30 && <AlertTriangle size={12} />}
                      {row.totalLoad}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Legend */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-indigo-50 border border-indigo-100 rounded"></span>
            <span>Active Assignment</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-100 rounded-full"></span>
            <span>High Workload (&gt;30)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-100 rounded-full"></span>
            <span>Normal Workload</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherLoadMatrix;
