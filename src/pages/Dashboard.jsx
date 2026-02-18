import React, { useState, useEffect } from "react";
import { getSchools, deleteSchool } from "../firebase/firebaseUtils.js";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Copy } from "lucide-react";

import CreateSchoolModal from "../components/modals/CreateSchoolModal";
import CopySchoolModal from "../components/modals/CopySchoolModal";
import EditSchoolModal from "../components/modals/EditSchoolModal";
import SchoolDetailModal from "../components/modals/SchoolDetailModal"; // NEW IMPORT

import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { SchoolGrid } from "../components/dashboard/SchoolGrid";

const Dashboard = () => {
  const { userRole, isViewer } = useAuth();
  const { addToast } = useToast();

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // EDIT & DETAIL STATES
  const [editingSchool, setEditingSchool] = useState(null);
  const [viewingDetailSchool, setViewingDetailSchool] = useState(null); // NEW STATE

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
    setIsCopyModalOpen(false);
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

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-2 h-8 bg-brand-orange rounded-full"></span>
          Your Schools
        </h2>

        {!isViewer && (
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none bg-brand-orange text-white px-6 py-2.5 rounded-lg font-bold hover:opacity-90 shadow-sm transition-all flex justify-center items-center gap-2"
            >
              <span>+</span> Create New School
            </button>
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
        onViewDetail={(school) => setViewingDetailSchool(school)} // NEW HANDLER
      />

      {/* Modals */}
      <CreateSchoolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSchoolCreated={handleSchoolCreated}
      />

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

      {/* NEW STATS MODAL */}
      <SchoolDetailModal
        isOpen={!!viewingDetailSchool}
        school={viewingDetailSchool}
        onClose={() => setViewingDetailSchool(null)}
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
