import React, { useState, useEffect } from "react";
import { X, Check, ChevronDown } from "lucide-react"; // Added ChevronDown

const SubjectModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
  departments,
  grades,
}) => {
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [selectedGradeIds, setSelectedGradeIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setDepartmentId(initialData.departmentId || "");
        setSelectedGradeIds(initialData.gradeIds || []);
      } else {
        setName("");
        setDepartmentId("");
        setSelectedGradeIds([]);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const toggleGrade = (gradeId) => {
    setSelectedGradeIds((prev) =>
      prev.includes(gradeId)
        ? prev.filter((id) => id !== gradeId)
        : [...prev, gradeId],
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const selectedDept = departments.find((d) => d.id === departmentId);

    const selectedGradesData = grades
      .filter((g) => selectedGradeIds.includes(g.id))
      .map((g) => ({ id: g.id, name: g.name }));

    onSubmit({
      name,
      departmentId,
      departmentName: selectedDept ? selectedDept.name : "Unknown",
      gradeIds: selectedGradeIds,
      gradeNames: selectedGradesData.map((g) => g.name),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">
            {initialData ? "Edit Subject" : "Add New Subject"}
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
          <form id="subjectForm" onSubmit={handleSubmit} className="space-y-6">
            {/* Subject Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Advanced Mathematics"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Department Select - Styled */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <div className="relative">
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none cursor-pointer transition-all"
                >
                  <option value="" disabled>
                    Select a Department
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {/* Custom Arrow Icon */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                  <ChevronDown size={20} />
                </div>
              </div>
              {departments.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  No departments found. Please add one first.
                </p>
              )}
            </div>

            {/* Classes Multi-Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taught In (Select Classes)
              </label>
              {grades.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No classes available.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {grades.map((grade) => (
                    <div
                      key={grade.id}
                      onClick={() => toggleGrade(grade.id)}
                      className={`
                        flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-all
                        ${
                          selectedGradeIds.includes(grade.id)
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "hover:bg-gray-50 border-transparent"
                        }
                      `}
                    >
                      <div
                        className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-colors
                        ${selectedGradeIds.includes(grade.id) ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white"}
                      `}
                      >
                        {selectedGradeIds.includes(grade.id) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className="text-sm select-none">{grade.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Selected: {selectedGradeIds.length} classes
              </p>
            </div>
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
            form="subjectForm"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save Subject"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubjectModal;
