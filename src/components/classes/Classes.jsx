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
import { Plus, Pencil, Trash2, Layers, Users, Clock } from "lucide-react"; // Added Clock icon
import ClassModal from "./ClassModal";

const Classes = () => {
  const { school } = useOutletContext();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Grades
  const fetchGrades = async () => {
    try {
      const q = query(
        collection(db, "schools", school.id, "grades"),
        orderBy("name", "asc"),
      );
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGrades(list);
    } catch (error) {
      console.error("Error fetching grades:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchGrades();
  }, [school?.id]);

  // 2. Add or Edit Logic
  const handleSave = async (formData) => {
    setIsSubmitting(true);
    try {
      const collectionRef = collection(db, "schools", school.id, "grades");

      const payload = {
        name: formData.name,
        sectionCount: formData.sectionCount,
        totalStudents: formData.totalStudents,
        periodsPerWeek: formData.periodsPerWeek, // New Field
        updatedAt: new Date(),
      };

      if (editingGrade) {
        await updateDoc(
          doc(db, "schools", school.id, "grades", editingGrade.id),
          payload,
        );
      } else {
        await addDoc(collectionRef, {
          ...payload,
          createdAt: new Date(),
        });
      }

      await fetchGrades();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving grade:", error);
      alert("Failed to save.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Delete Logic
  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete ${name}?`)) {
      try {
        await deleteDoc(doc(db, "schools", school.id, "grades", id));
        setGrades((prev) => prev.filter((g) => g.id !== id));
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  const openAddModal = () => {
    setEditingGrade(null);
    setIsModalOpen(true);
  };

  const openEditModal = (grade) => {
    setEditingGrade(grade);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGrade(null);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">Loading classes...</div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Class Management</h2>
          <p className="text-sm text-gray-500">
            Define grade levels, sections, students, and periods.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={18} />
          Add Grade Level
        </button>
      </div>

      {/* Empty State */}
      {grades.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Layers className="text-blue-500" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No classes defined
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Create your first grade level.
          </p>
        </div>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grades.map((grade) => (
            <div
              key={grade.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {grade.name}
                  </h3>
                  {/* Badges Container */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      <Layers size={12} /> {grade.sectionCount} Sections
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                      <Users size={12} /> {grade.totalStudents || 0} Students
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                      <Clock size={12} /> {grade.periodsPerWeek || 0} p/w
                    </span>
                  </div>
                </div>

                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(grade)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(grade.id, grade.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClassModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        initialData={editingGrade}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default Classes;
