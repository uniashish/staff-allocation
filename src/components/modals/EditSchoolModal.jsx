import React, { useState, useEffect } from "react";
import { updateSchool } from "../../firebase/firebaseUtils";
import { Input } from "../ui/Input";
import { useToast } from "../../context/ToastContext";

const EditSchoolModal = ({ isOpen, onClose, school, onSchoolUpdated }) => {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // Populate form when the 'school' prop changes
  useEffect(() => {
    if (school) {
      setName(school.name || "");
      setLocation(school.location || "");
    }
  }, [school]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!school) return;

    setLoading(true);

    try {
      await updateSchool(school.id, {
        name,
        location,
      });

      addToast("School updated successfully!", "success");

      // Pass the updated data back to Dashboard to update the UI locally
      onSchoolUpdated({ ...school, name, location });
      onClose();
    } catch (error) {
      console.error("Update Error:", error);
      addToast("Failed to update school.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Edit School</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="School Name"
            placeholder="e.g. Springfield High"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Location / District"
            placeholder="e.g. North District"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white bg-brand-teal hover:bg-teal-700 rounded-lg font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSchoolModal;
