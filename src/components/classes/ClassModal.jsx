import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const ClassModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
}) => {
  const [name, setName] = useState("");
  const [sectionCount, setSectionCount] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [periodsPerWeek, setPeriodsPerWeek] = useState(0);

  // New state to track which input is focused
  const [activeField, setActiveField] = useState("default");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setSectionCount(initialData.sectionCount || 1);
        setTotalStudents(initialData.totalStudents || 0);
        setPeriodsPerWeek(initialData.periodsPerWeek || 0);
      } else {
        setName("");
        setSectionCount(1);
        setTotalStudents(0);
        setPeriodsPerWeek(0);
      }
      // Reset help text to default when opening
      setActiveField("default");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      sectionCount: parseInt(sectionCount),
      totalStudents: parseInt(totalStudents),
      periodsPerWeek: parseInt(periodsPerWeek),
    });
  };

  // Logic to determine which help text to show
  const getHelpText = () => {
    switch (activeField) {
      case "name":
        return "Enter a unique identifier for this grade level (e.g., 'Primary 1', 'Grade 10', 'Year 7').";
      case "sectionCount":
        return `Defines how many separate classes/divisions exist for ${
          name || "this grade"
        }. (e.g., If you have 4A, 4B, 4C, and 4D, enter 4).`;
      case "totalStudents":
        return `The total number of students enrolled across all ${sectionCount} sections. This helps calculate the average class size.`;
      case "periodsPerWeek":
        return 'Note: "Periods/Week" represents the total teaching slots available for this grade level in the weekly timetable.';
      default:
        return "Hover or click on a field to see helpful details about what to enter.";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">
            {initialData ? "Edit Grade Level" : "Add Grade Level"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Grade Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setActiveField("name")} // Update active field
              placeholder="e.g. Primary 1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Stats Grid (3 Columns) */}
          <div className="grid grid-cols-3 gap-4">
            {/* Number of Sections */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sections
              </label>
              <input
                type="number"
                min="1"
                required
                value={sectionCount}
                onChange={(e) => setSectionCount(e.target.value)}
                onFocus={() => setActiveField("sectionCount")} // Update active field
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Total Students */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Students
              </label>
              <input
                type="number"
                min="0"
                required
                value={totalStudents}
                onChange={(e) => setTotalStudents(e.target.value)}
                onFocus={() => setActiveField("totalStudents")} // Update active field
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Periods Per Week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periods/Week
              </label>
              <input
                type="number"
                min="0"
                required
                value={periodsPerWeek}
                onChange={(e) => setPeriodsPerWeek(e.target.value)}
                onFocus={() => setActiveField("periodsPerWeek")} // Update active field
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Dynamic Help Message */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[3rem] flex items-center transition-all duration-200">
            <p>{getHelpText()}</p>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Saving..." : "Save Grade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassModal;
