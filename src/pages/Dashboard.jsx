import React, { useState, useEffect } from "react";
import { getSchools, deleteSchool } from "../firebase/firebaseUtils.js";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Copy } from "lucide-react"; // Import Icon

import CreateSchoolModal from "../components/modals/CreateSchoolModal";
import CopySchoolModal from "../components/modals/CopySchoolModal"; // Import New Modal
import EditSchoolModal from "../components/modals/EditSchoolModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { SchoolGrid } from "../components/dashboard/SchoolGrid";

const Dashboard = () => {
  const { userRole, isViewer } = useAuth();
  const { addToast } = useToast();

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false); // New State

  const [editingSchool, setEditingSchool] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const data = await getSchools();
      setSchools(data);
    } catch (error) {
      console.error("Load Error:", error);
      addToast("Failed to load schools.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolCreated = (newSchool) => {
    setSchools((prev) => [newSchool, ...prev]);
    setIsCreateModalOpen(false);
    setIsCopyModalOpen(false); // Close copy modal too if successful
    addToast("School created successfully!", "success");
  };

  const handleSchoolUpdated = (updatedSchool) => {
    setSchools((prev) =>
      prev.map((s) => (s.id === updatedSchool.id ? updatedSchool : s)),
    );
    setEditingSchool(null);
    addToast("School updated successfully!", "success");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteSchool(deleteId);
      setSchools((prev) => prev.filter((s) => s.id !== deleteId));
      addToast("School deleted successfully.", "success");
    } catch (error) {
      console.error("Delete Error:", error);
      addToast("Failed to delete school.", "error");
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-teal to-teal-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            Welcome to SIS Schools Staff Allocation Dashboard
          </h1>
          <p className="text-teal-100 text-lg max-w-2xl">
            Manage your schools, departments, subjects and staff allocations
            efficiently.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
          <svg width="300" height="300" viewBox="0 0 200 200">
            <path
              fill="currentColor"
              d="M45.7,-76.3C58.9,-69.3,69.1,-55.6,76.3,-40.8C83.5,-26,87.6,-10.2,85.2,4.6C82.8,19.4,73.9,33.2,63.1,44.2C52.3,55.2,39.6,63.4,26.2,69.1C12.8,74.8,-1.3,78,-14.8,74.6C-28.3,71.2,-41.2,61.2,-52.6,49.2C-64,37.2,-73.9,23.2,-77.4,7.5C-80.9,-8.2,-78,-25.6,-68.8,-39.8C-59.6,-54,-44.1,-65,-29.4,-71.2C-14.7,-77.4,-0.8,-78.8,14.6,-78.8"
            />
          </svg>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-2 h-8 bg-brand-orange rounded-full"></span>
          Your Schools
        </h2>

        {!isViewer && (
          <div className="flex gap-3 w-full sm:w-auto">
            {/* Create New Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none bg-brand-orange text-white px-6 py-2.5 rounded-lg font-bold hover:opacity-90 shadow-sm transition-all flex justify-center items-center gap-2"
            >
              <span>+</span> Create New School
            </button>

            {/* Copy School Button */}
            <button
              onClick={() => setIsCopyModalOpen(true)}
              className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 shadow-sm transition-all flex justify-center items-center gap-2"
            >
              <Copy size={18} /> Copy School
            </button>
          </div>
        )}
      </div>

      <SchoolGrid
        schools={schools}
        loading={loading}
        userRole={userRole}
        onRequestDelete={(id) => {
          setDeleteId(id);
          setIsDeleteConfirmOpen(true);
        }}
        onEdit={(school) => setEditingSchool(school)}
      />

      <CreateSchoolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSchoolCreated={handleSchoolCreated}
      />

      {/* NEW COPY MODAL */}
      <CopySchoolModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        schools={schools}
        onSchoolCreated={handleSchoolCreated}
      />

      <EditSchoolModal
        isOpen={!!editingSchool}
        school={editingSchool}
        onClose={() => setEditingSchool(null)}
        onSchoolUpdated={handleSchoolUpdated}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete School?"
        message="This action cannot be undone. All allocations within this school will be lost."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        isDestructive={true}
      />
    </div>
  );
};

export default Dashboard;
