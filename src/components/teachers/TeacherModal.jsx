import React, { useState, useEffect } from "react";
import { X, Check, Building2, BookOpen, Clock } from "lucide-react";

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
  const [maxLoad, setMaxLoad] = useState(30); // Default to 30 periods
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        // Load existing maxLoad or default to 30
        setMaxLoad(
          initialData.maxLoad !== undefined ? initialData.maxLoad : 30,
        );
        setSelectedDeptIds(initialData.departmentIds || []);
        setSelectedSubjectIds(initialData.subjectIds || []);
      } else {
        setName("");
        setMaxLoad(30);
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
        return [...prev, deptId];
      }
    });
  };

  const toggleSubject = (subjectId) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Get names for selected IDs
    const selectedDeptNames = departments
      .filter((d) => selectedDeptIds.includes(d.id))
      .map((d) => d.name);

    const selectedSubjectNames = subjects
      .filter((s) => selectedSubjectIds.includes(s.id))
      .map((s) => s.name);

    onSubmit({
      name,
      maxLoad: parseInt(maxLoad) || 0, // Save the maxLoad
      departmentIds: selectedDeptIds,
      departmentNames: selectedDeptNames,
      subjectIds: selectedSubjectIds,
      subjectNames: selectedSubjectNames,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-auto overflow-hidden flex flex-col max-h-[90vh]">
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

        {/* Scrollable Form Area */}
        <div className="p-6 overflow-y-auto">
          <form id="teacherForm" onSubmit={handleSubmit} className="space-y-6">
            {/* Row: Name and Max Load */}
            <div className="grid grid-cols-3 gap-4">
              {/* Teacher Name */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Wilson"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {/* Max Load Input */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  Max Load <span className="text-gray-400 text-xs">(p/w)</span>
                </label>
                <div className="relative">
                  <Clock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={maxLoad}
                    onChange={(e) => setMaxLoad(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Departments Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-gray-400" />
                Departments
              </label>
              {departments.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No departments found.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {departments.map((dept) => {
                    const isSelected = selectedDeptIds.includes(dept.id);
                    return (
                      <div
                        key={dept.id}
                        onClick={() => toggleDepartment(dept.id)}
                        className={`
                          flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all
                          ${
                            isSelected
                              ? "bg-blue-50 border-blue-200 text-blue-900"
                              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                          }
                        `}
                      >
                        <div
                          className={`
                            w-4 h-4 rounded border flex items-center justify-center
                            ${
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "bg-white border-gray-300"
                            }
                          `}
                        >
                          {isSelected && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{dept.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subjects Selection (Filtered by Department) */}
            {selectedDeptIds.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <BookOpen size={16} className="text-gray-400" />
                  Qualified Subjects
                </label>

                {selectedDeptIds.map((deptId) => {
                  const deptName = departments.find(
                    (d) => d.id === deptId,
                  )?.name;
                  const deptSubjects = subjects.filter(
                    (s) => s.departmentId === deptId,
                  );

                  if (deptSubjects.length === 0) return null;

                  return (
                    <div key={deptId} className="mb-4 last:mb-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                        {deptName}
                      </p>
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
                                flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all
                                ${
                                  isSelected
                                    ? "bg-green-50 border-green-200"
                                    : "bg-white border-gray-100 hover:border-green-200 hover:bg-green-50/50"
                                }
                              `}
                            >
                              <div
                                className={`
                                w-4 h-4 rounded border flex items-center justify-center
                                ${isSelected ? "bg-green-500 border-green-500" : "bg-white border-gray-300"}
                              `}
                              >
                                {isSelected && (
                                  <Check size={12} className="text-white" />
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
