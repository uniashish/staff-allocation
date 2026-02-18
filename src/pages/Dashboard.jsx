import React, { useState, useEffect } from "react";
import { getSchools, deleteSchool, db } from "../firebase/firebaseUtils.js";
import { collection, query, getDocs, limit } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Copy, Users } from "lucide-react"; // Import Users Icon

import CreateSchoolModal from "../components/modals/CreateSchoolModal";
import CopySchoolModal from "../components/modals/CopySchoolModal";
import EditSchoolModal from "../components/modals/EditSchoolModal";
import SchoolDetailModal from "../components/modals/SchoolDetailModal";
import DeleteSchoolModal from "../components/modals/DeleteSchoolModal";
import UserManagementModal from "../components/modals/UserManagementModal"; // NEW IMPORT

import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { SchoolGrid } from "../components/dashboard/SchoolGrid";

const Dashboard = () => {
  const { userRole, isViewer, currentUser } = useAuth(); // Ensure currentUser is available
  const { addToast } = useToast();

  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false); // NEW STATE

  // Active Item States
  const [editingSchool, setEditingSchool] = useState(null);
  const [viewingDetailSchool, setViewingDetailSchool] = useState(null);

  // Deletion States
  const [schoolToDelete, setSchoolToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // --- HANDLERS ---

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

  // --- NEW DELETE LOGIC ---

  const handleRequestDelete = async (schoolId) => {
    const school = schools.find((s) => s.id === schoolId);
    if (!school) return;

    try {
      // 1. Check for allocations
      const allocationsRef = collection(db, "schools", schoolId, "allocations");
      const q = query(allocationsRef, limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        addToast(
          "Cannot delete school: It has active teacher allocations. Please clear them first.",
          "error",
        );
        return;
      }

      // 2. If safe, open modal
      setSchoolToDelete(school);
    } catch (error) {
      console.error("Validation error:", error);
      addToast("Failed to validate school status.", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!schoolToDelete) return;

    setIsDeleting(true);
    try {
      await deleteSchool(schoolToDelete.id);
      setSchools((prev) => prev.filter((s) => s.id !== schoolToDelete.id));
      addToast("School deleted successfully.", "success");
      setSchoolToDelete(null);
    } catch (error) {
      console.error("Delete Error:", error);
      addToast("Failed to delete school.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if current user is super admin
  const isSuperAdmin =
    currentUser?.role === "super_admin" || userRole === "super_admin";

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-teal to-teal-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome to Your Dashboard</h1>
          <p className="text-teal-100 text-lg max-w-2xl">
            Manage your schools, departments, and staff allocations efficiently.
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

        {/* CHANGED: All action buttons now require isSuperAdmin */}
        {isSuperAdmin && (
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            {/* Create New School */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none bg-brand-orange text-white px-5 py-2.5 rounded-lg font-bold hover:opacity-90 shadow-sm transition-all flex justify-center items-center gap-2"
            >
              <span>+</span> Create New School
            </button>

            {/* Copy School */}
            <button
              onClick={() => setIsCopyModalOpen(true)}
              className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 shadow-sm transition-all flex justify-center items-center gap-2"
            >
              <Copy size={18} /> Copy School
            </button>

            {/* Manage Users */}
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="flex-1 sm:flex-none bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-slate-900 shadow-sm transition-all flex justify-center items-center gap-2"
            >
              <Users size={18} /> Manage Users
            </button>
          </div>
        )}
      </div>

      <SchoolGrid
        schools={schools}
        loading={loading}
        userRole={userRole}
        onRequestDelete={handleRequestDelete}
        onEdit={(school) => setEditingSchool(school)}
        onViewDetail={(school) => setViewingDetailSchool(school)}
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

      <SchoolDetailModal
        isOpen={!!viewingDetailSchool}
        school={viewingDetailSchool}
        onClose={() => setViewingDetailSchool(null)}
      />

      <DeleteSchoolModal
        isOpen={!!schoolToDelete}
        schoolName={schoolToDelete?.name}
        onClose={() => setSchoolToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* NEW USER MODAL */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
