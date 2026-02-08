import React from "react";
import { X, User, BookOpen, Building2 } from "lucide-react";

const DepartmentDetailModal = ({
  isOpen,
  onClose,
  department,
  teachers,
  subjects,
}) => {
  if (!isOpen || !department) return null;

  // Filter data specifically for this department
  const deptTeachers = teachers.filter(
    (t) => t.departmentIds && t.departmentIds.includes(department.id),
  );

  const deptSubjects = subjects.filter((s) => s.departmentId === department.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {department.name}
              </h2>
              <p className="text-sm text-gray-500">Department Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full hover:bg-gray-100 border border-transparent hover:border-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-8">
          {/* Section 1: Teachers */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="text-blue-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">
                Faculty Members ({deptTeachers.length})
              </h3>
            </div>

            {deptTeachers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deptTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-slate-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {teacher.name.charAt(0)}
                    </div>
                    <span className="text-gray-700 font-medium">
                      {teacher.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic pl-1">
                No teachers assigned to this department yet.
              </p>
            )}
          </div>

          <div className="border-t border-gray-100"></div>

          {/* Section 2: Subjects */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="text-emerald-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-800">
                Curriculum Subjects ({deptSubjects.length})
              </h3>
            </div>

            {deptSubjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deptSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="p-3 rounded-lg border border-gray-100 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
                  >
                    <div className="font-medium text-emerald-900">
                      {subject.name}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {subject.gradeNames && subject.gradeNames.length > 0 ? (
                        subject.gradeNames.slice(0, 3).map((g, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 bg-white border border-emerald-100 rounded text-emerald-600"
                          >
                            {g}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400">
                          No classes assigned
                        </span>
                      )}
                      {subject.gradeNames?.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 text-gray-400">
                          +{subject.gradeNames.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic pl-1">
                No subjects created for this department yet.
              </p>
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

export default DepartmentDetailModal;
