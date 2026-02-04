import React, { useState, useEffect } from "react";
import { getSchools, deleteSchool } from "../firebase/firebaseUtils.js";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

import CreateSchoolModal from "../components/modals/CreateSchoolModal";
import EditSchoolModal from "../components/modals/EditSchoolModal"; // <--- Ensure imported
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { SchoolGrid } from "../components/dashboard/SchoolGrid";

const Dashboard = () => {
  const { userRole, isViewer } = useAuth();
  const { addToast } = useToast();

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // EDIT STATE: Holds the school object being edited
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
    addToast("School created successfully!", "success");
  };

  // NEW: Handle updates from the Edit Modal
  const handleSchoolUpdated = (updatedSchool) => {
    setSchools((prev) =>
      prev.map((school) =>
        school.id === updatedSchool.id ? updatedSchool : school,
      ),
    );
    addToast("School updated successfully!", "success");
    setEditingSchool(null); // Close the modal
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteSchool(deleteId);
      setSchools((prev) => prev.filter((school) => school.id !== deleteId));
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
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              School Management
            </h1>
            <p className="text-slate-500">
              Create and manage school allocation sandboxes
            </p>
          </div>

          {!isViewer && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto bg-brand-orange text-white px-6 py-2.5 rounded-lg font-bold hover:opacity-90 shadow-sm transition-all flex justify-center items-center gap-2"
            >
              <span>+</span> Create New School
            </button>
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
          // CONNECT THE EDIT BUTTON HERE
          onEdit={(school) => setEditingSchool(school)}
        />
      </div>

      <CreateSchoolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSchoolCreated={handleSchoolCreated}
      />

      {/* RENDER EDIT MODAL if editingSchool exists */}
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
