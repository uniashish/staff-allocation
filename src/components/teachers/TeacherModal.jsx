import React, { useState, useEffect } from "react";
import { X, Check, Building2, BookOpen } from "lucide-react";

const TeacherModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
  departments,
  subjects,
}) => {
  const [name, setName] = useState("");
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setSelectedDeptIds(initialData.departmentIds || []);
        setSelectedSubjectIds(initialData.subjectIds || []);
      } else {
        setName("");
        setSelectedDeptIds([]);
        setSelectedSubjectIds([]);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // -- Handlers --

  const toggleDepartment = (deptId) => {
    setSelectedDeptIds((prev) => {
      const isRemoving = prev.includes(deptId);
      if (isRemoving) {
        // If removing a department, also remove its subjects
        const deptSubjects = subjects
          .filter((s) => s.departmentId === deptId)
          .map((s) => s.id);

        // Remove deptId from selection
        const newDepts = prev.filter((id) => id !== deptId);

        // Remove associated subjects from selection
        setSelectedSubjectIds((currentSubjects) =>
          currentSubjects.filter((sid) => !deptSubjects.includes(sid)),
        );

        return newDepts;
      } else {
        // Add department
        return [...prev, deptId];
      }
    });
  };

  const toggleSubject = (subjectId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Denormalize names for easy display
    const selectedDeptsData = departments.filter((d) =>
      selectedDeptIds.includes(d.id),
    );
    const selectedSubjectsData = subjects.filter((s) =>
      selectedSubjectIds.includes(s.id),
    );

    onSubmit({
      name,
      departmentIds: selectedDeptIds,
      departmentNames: selectedDeptsData.map((d) => d.name),
      subjectIds: selectedSubjectIds,
      subjectNames: selectedSubjectsData.map((s) => s.name),
    });
  };

  // Filter subjects based on selected departments
  const availableSubjects = subjects.filter((s) =>
    selectedDeptIds.includes(s.departmentId),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">
            {initialData ? "Edit Teacher" : "Add New Teacher"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto">
          <form id="teacherForm" onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teacher Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Connor"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* 2. Departments Selection */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Building2 size={16} />
                Select Departments
              </label>
              {departments.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No departments available.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {departments.map((dept) => {
                    const isSelected = selectedDeptIds.includes(dept.id);
                    return (
                      <div
                        key={dept.id}
                        onClick={() => toggleDepartment(dept.id)}
                        className={`
                          cursor-pointer px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2
                          ${
                            isSelected
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                          }
                        `}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected
                              ? "bg-blue-500 border-blue-500"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        {dept.name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Subjects Selection (Grouped by Department) */}
            {selectedDeptIds.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <BookOpen size={16} />
                  Select Subjects to Teach
                </label>

                {availableSubjects.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-sm text-gray-500">
                    No subjects found in the selected departments.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Group subjects by department for display */}
                    {selectedDeptIds.map((deptId) => {
                      const deptName = departments.find(
                        (d) => d.id === deptId,
                      )?.name;
                      const deptSubjects = availableSubjects.filter(
                        (s) => s.departmentId === deptId,
                      );

                      if (deptSubjects.length === 0) return null;

                      return (
                        <div
                          key={deptId}
                          className="bg-gray-50 p-4 rounded-xl border border-gray-100"
                        >
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                            {deptName}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {deptSubjects.map((subject) => {
                              const isSelected = selectedSubjectIds.includes(
                                subject.id,
                              );
                              return (
                                <div
                                  key={subject.id}
                                  onClick={() => toggleSubject(subject.id)}
                                  className={`
                                    flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-all bg-white
                                    ${
                                      isSelected
                                        ? "border-green-200 shadow-sm ring-1 ring-green-200"
                                        : "border-gray-200 hover:border-gray-300"
                                    }
                                  `}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "bg-green-500 border-green-500"
                                        : "border-gray-300"
                                    }`}
                                  >
                                    {isSelected && (
                                      <Check size={10} className="text-white" />
                                    )}
                                  </div>
                                  <span
                                    className={`text-sm ${isSelected ? "text-gray-900 font-medium" : "text-gray-600"}`}
                                  >
                                    {subject.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="teacherForm"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save Teacher"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherModal;
