import React, { useState, useEffect } from "react";
import { X, Check, ChevronDown, Clock } from "lucide-react";

const SubjectModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
  departments,
  grades,
  allocations, // Receive allocations
}) => {
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [selectedGradeIds, setSelectedGradeIds] = useState([]);
  // New State: Track periods for each grade { gradeId: numberOfPeriods }
  const [gradePeriods, setGradePeriods] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setDepartmentId(initialData.departmentId || "");
        setSelectedGradeIds(initialData.gradeIds || []);

        // Load existing period data if available
        if (initialData.gradeDetails) {
          const periodsMap = {};
          initialData.gradeDetails.forEach((detail) => {
            periodsMap[detail.id] = detail.periods;
          });
          setGradePeriods(periodsMap);
        } else {
          setGradePeriods({});
        }
      } else {
        setName("");
        setDepartmentId("");
        setSelectedGradeIds([]);
        setGradePeriods({});
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const toggleGrade = (gradeId) => {
    setSelectedGradeIds((prev) => {
      const isSelected = prev.includes(gradeId);
      if (isSelected) {
        // --- VALIDATION START ---
        // If we are editing an existing subject, check for active allocations before removing
        if (initialData && allocations) {
          const hasAllocations = allocations.some(
            (a) => a.subjectId === initialData.id && a.gradeId === gradeId,
          );

          if (hasAllocations) {
            alert(
              "Cannot remove this class. There are active teacher allocations for this subject in this class. Please remove the allocations first.",
            );
            return prev; // Do not update state
          }
        }
        // --- VALIDATION END ---

        // Removing: Clean up periods state (optional but cleaner)
        const newPeriods = { ...gradePeriods };
        delete newPeriods[gradeId];
        setGradePeriods(newPeriods);
        return prev.filter((id) => id !== gradeId);
      } else {
        // Adding: Default periods to 0 or empty
        return [...prev, gradeId];
      }
    });
  };

  const handlePeriodChange = (gradeId, value) => {
    setGradePeriods((prev) => ({
      ...prev,
      [gradeId]: parseInt(value) || 0,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const selectedDept = departments.find((d) => d.id === departmentId);

    // Create the structured grade details array
    const gradeDetails = grades
      .filter((g) => selectedGradeIds.includes(g.id))
      .map((g) => ({
        id: g.id,
        name: g.name,
        periods: gradePeriods[g.id] || 0, // Include the periods count
      }));

    onSubmit({
      name,
      departmentId,
      departmentName: selectedDept ? selectedDept.name : "Unknown",
      gradeIds: selectedGradeIds, // Keep IDs for easy filtering
      gradeDetails, // New field containing IDs, Names, and Periods
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

            {/* Classes Multi-Select with Periods */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taught In (Select Classes & Set Periods)
              </label>
              {grades.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No classes available.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {grades.map((grade) => {
                    const isSelected = selectedGradeIds.includes(grade.id);
                    return (
                      <div
                        key={grade.id}
                        className={`
                        flex items-center justify-between p-2 rounded-md border transition-all
                        ${
                          isSelected
                            ? "bg-blue-50 border-blue-200"
                            : "hover:bg-gray-50 border-transparent"
                        }
                      `}
                      >
                        {/* Checkbox and Name Area */}
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => toggleGrade(grade.id)}
                        >
                          <div
                            className={`
                            w-5 h-5 rounded border flex items-center justify-center transition-colors
                            ${
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 bg-white"
                            }
                          `}
                          >
                            {isSelected && (
                              <Check size={14} className="text-white" />
                            )}
                          </div>
                          <span
                            className={`text-sm select-none ${isSelected ? "text-blue-900 font-medium" : "text-gray-700"}`}
                          >
                            {grade.name}
                          </span>
                        </div>

                        {/* Periods Input - Only visible if selected */}
                        {isSelected && (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                            <Clock size={14} className="text-blue-400" />
                            <input
                              type="number"
                              min="1"
                              placeholder="#"
                              className="w-16 px-2 py-1 text-sm border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center"
                              value={gradePeriods[grade.id] || ""}
                              onChange={(e) =>
                                handlePeriodChange(grade.id, e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking input
                            />
                            <span className="text-xs text-blue-500 font-medium">
                              p/w
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
