import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseUtils";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import DepartmentModal from "./DepartmentModal";

const Departments = () => {
  const { school } = useOutletContext(); // Get schoolId from Layout
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Departments
  const fetchDepartments = async () => {
    try {
      const q = query(
        collection(db, "schools", school.id, "departments"),
        orderBy("name"),
      );
      const querySnapshot = await getDocs(q);
      const deptList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDepartments(deptList);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchDepartments();
  }, [school?.id]);

  // 2. Add or Edit Department
  const handleSave = async (formData) => {
    setIsSubmitting(true);
    try {
      const deptRef = collection(db, "schools", school.id, "departments");

      if (editingDept) {
        // Update existing
        await updateDoc(
          doc(db, "schools", school.id, "departments", editingDept.id),
          {
            name: formData.name,
          },
        );
      } else {
        // Create new
        await addDoc(deptRef, {
          name: formData.name,
          createdAt: new Date(),
          teacherCount: 0, // Initialize counters if needed later
        });
      }

      await fetchDepartments(); // Refresh list
      handleCloseModal();
    } catch (error) {
      console.error("Error saving department:", error);
      alert("Failed to save department.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Delete Department
  const handleDelete = async (id, name) => {
    if (
      window.confirm(`Are you sure you want to delete the ${name} department?`)
    ) {
      try {
        await deleteDoc(doc(db, "schools", school.id, "departments", id));
        setDepartments((prev) => prev.filter((dept) => dept.id !== id));
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Failed to delete. Try again.");
      }
    }
  };

  // Modal Handlers
  const openAddModal = () => {
    setEditingDept(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDept(null);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading departments...
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Departments</h2>
          <p className="text-sm text-gray-500">
            Manage subject departments for {school.name}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={18} />
          Add Department
        </button>
      </div>

      {/* Empty State */}
      {departments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building2 className="text-blue-500" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No departments yet
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Get started by adding your first department.
          </p>
        </div>
      ) : (
        /* Data Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="bg-blue-50 text-blue-700 p-2 rounded-lg">
                  <Building2 size={20} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(dept)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id, dept.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 text-lg">
                {dept.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                0 Teachers • 0 Classes
                {/* We will wire these counts up later */}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <DepartmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        initialData={editingDept}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default Departments;
