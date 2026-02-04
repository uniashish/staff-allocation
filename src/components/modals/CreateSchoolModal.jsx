import React, { useState } from "react";
import { createSchool } from "../../firebase/firebaseUtils.js";

const CreateSchoolModal = ({ isOpen, onClose, onSchoolCreated }) => {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Capture the new ID returned from Firebase
      const newSchoolId = await createSchool({ name, location });

      // 2. Create the complete school object to update the UI immediately
      const newSchoolData = {
        id: newSchoolId,
        name: name,
        location: location,
        createdAt: new Date(), // Optional: helps if you sort by date later
      };

      // 3. Clear form
      setName("");
      setLocation("");

      // 4. Pass the DATA back to Dashboard so it can update the grid
      onSchoolCreated(newSchoolData);
    } catch (error) {
      console.error("Creation error:", error);
      alert("Error creating school: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Add New School
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School Name
            </label>
            <input
              required
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none transition-all"
              placeholder="e.g. Westside Elementary"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location / District
            </label>
            <input
              required
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none transition-all"
              placeholder="e.g. New York"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-brand-orange text-white rounded-lg font-bold hover:opacity-90 shadow-md transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : "Create School"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSchoolModal;
