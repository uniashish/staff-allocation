import React, { useMemo } from "react";
import { X, Layers, User, BookOpen } from "lucide-react";

const ClassDetailModal = ({ isOpen, onClose, grade, teachers, subjects }) => {
  if (!isOpen || !grade) return null;

  // Logic to find which teachers teach which subjects in THIS specific grade
  const classData = useMemo(() => {
    const data = [];

    // 1. Find all subjects taught in this grade
    const subjectsInGrade = subjects.filter(
      (s) => s.gradeIds && s.gradeIds.includes(grade.id),
    );

    // 2. For each subject, find the teacher(s) assigned to it
    // Note: In this data model, teachers have 'subjectIds'.
    // We need to see which teachers have this subject ID.
    subjectsInGrade.forEach((subject) => {
      const assignedTeachers = teachers.filter(
        (t) => t.subjectIds && t.subjectIds.includes(subject.id),
      );

      if (assignedTeachers.length > 0) {
        assignedTeachers.forEach((teacher) => {
          data.push({
            subjectName: subject.name,
            teacherName: teacher.name,
            department: subject.departmentName || "General",
          });
        });
      } else {
        // Subject is in curriculum but no teacher assigned yet
        data.push({
          subjectName: subject.name,
          teacherName: "Not Assigned",
          department: subject.departmentName || "General",
          isUnassigned: true,
        });
      }
    });

    return data;
  }, [grade, teachers, subjects]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
              <Layers size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{grade.name}</h2>
              <p className="text-sm text-gray-500">Class Schedule & Faculty</p>
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
        <div className="p-6 overflow-y-auto">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Total Students
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {grade.totalStudents || 0}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Sections
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {grade.sectionCount || 1}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Subjects Taught
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(classData.map((d) => d.subjectName)).size}
              </p>
            </div>
          </div>

          {/* Table */}
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Faculty Assignments
          </h3>
          {classData.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teacher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {classData.map((row, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <BookOpen size={16} className="text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {row.subjectName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {row.isUnassigned ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Unassigned
                          </span>
                        ) : (
                          <div className="flex items-center">
                            <User size={16} className="text-gray-400 mr-2" />
                            <span className="text-sm text-gray-700">
                              {row.teacherName}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.department}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">
                No subjects or teachers assigned to this class yet.
              </p>
            </div>
          )}
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

export default ClassDetailModal;
