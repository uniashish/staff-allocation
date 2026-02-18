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
import { Plus, Pencil, Trash2, Layers, Users } from "lucide-react";
import ClassModal from "./ClassModal";
import ClassDetailModal from "./ClassDetailModal";
import { useAuth } from "../../hooks/useAuth";

const Classes = () => {
  const { school } = useOutletContext();
  const { userData } = useAuth();
  const isSuperAdmin = userData?.role === "super_admin";

  // Data State
  const [grades, setGrades] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [viewingGrade, setViewingGrade] = useState(null);

  // 1. Fetch All Data
  const fetchData = async () => {
    try {
      const [gradeSnap, teachSnap, subjSnap, allocSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "schools", school.id, "grades"),
            orderBy("name", "asc"),
          ),
        ),
        getDocs(collection(db, "schools", school.id, "teachers")),
        getDocs(collection(db, "schools", school.id, "subjects")),
        getDocs(collection(db, "schools", school.id, "allocations")),
      ]);

      const gradeList = gradeSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGrades(gradeList);

      const teachList = teachSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeachers(teachList);

      const subjList = subjSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubjects(subjList);

      const allocList = allocSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllocations(allocList);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id]);

  // Helper: Calculate Progress Percentage
  const getProgressStyle = (gradeId) => {
    // 1. Calculate Required Periods (Demand)
    let totalRequired = 0;
    subjects.forEach((subj) => {
      const detail = subj.gradeDetails?.find((g) => g.id === gradeId);
      if (detail) {
        totalRequired += parseInt(detail.periods) || 0;
      }
    });

    // 2. Calculate Allocated Periods (Supply)
    let totalAllocated = 0;
    const gradeAllocations = allocations.filter((a) => a.gradeId === gradeId);
    gradeAllocations.forEach((alloc) => {
      totalAllocated += parseInt(alloc.periodsPerWeek) || 0;
    });

    // 3. Calculate Percentage
    const percentage =
      totalRequired > 0
        ? Math.min((totalAllocated / totalRequired) * 100, 100)
        : 0;

    // 4. Return Gradient Style
    // Updated to darker shades: Green-200 (#bbf7d0) and Red-200 (#fecaca)
    return {
      background: `linear-gradient(90deg, #bbf7d0 ${percentage}%, #fecaca ${percentage}%)`,
    };
  };

  // Save Logic
  const handleSave = async (formData) => {
    setIsSubmitting(true);
    try {
      const collectionRef = collection(db, "schools", school.id, "grades");
      if (editingGrade) {
        await updateDoc(
          doc(db, "schools", school.id, "grades", editingGrade.id),
          {
            ...formData,
            updatedAt: new Date(),
          },
        );
      } else {
        await addDoc(collectionRef, {
          ...formData,
          createdAt: new Date(),
        });
      }
      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving grade:", error);
      alert("Failed to save class.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Logic
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteDoc(doc(db, "schools", school.id, "grades", id));
        setGrades((prev) => prev.filter((g) => g.id !== id));
      } catch (error) {
        console.error("Error deleting grade:", error);
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Classes & Sections
          </h2>
          <p className="text-sm text-gray-500">
            Manage grade levels and student counts.
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus size={18} />
            Add Class
          </button>
        )}
      </div>

      {/* Grid Layout */}
      {grades.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Layers className="text-blue-500" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No classes found
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Add your first grade level to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grades.map((grade) => (
            <div
              key={grade.id}
              onClick={() => setViewingGrade(grade)}
              style={getProgressStyle(grade.id)} // Apply Darker Gradient
              className="p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden"
            >
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {grade.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Users size={14} />{" "}
                      {grade.totalStudents || grade.studentCount || 0} Students
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers size={14} /> {grade.sectionCount || 1} Sections
                    </span>
                  </div>
                </div>

                {/* Actions — Only visible to super_admin on hover */}
                {isSuperAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(grade);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white/50 rounded-md"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(grade.id, grade.name);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white/50 rounded-md"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <ClassModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        initialData={editingGrade}
        isSubmitting={isSubmitting}
      />

      {/* Detail Modal */}
      <ClassDetailModal
        isOpen={!!viewingGrade}
        onClose={() => setViewingGrade(null)}
        grade={viewingGrade}
        teachers={teachers}
        subjects={subjects}
        allocations={allocations}
      />
    </div>
  );
};

export default Classes;
