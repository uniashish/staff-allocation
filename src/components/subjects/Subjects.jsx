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
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import SubjectModal from "./SubjectModal";

const Subjects = () => {
  const { school } = useOutletContext();
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [allocations, setAllocations] = useState([]); // New state for validation
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch All Required Data
  const fetchData = async () => {
    try {
      // Fetch Subjects
      const subjectsQuery = query(
        collection(db, "schools", school.id, "subjects"),
        orderBy("name"),
      );
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const subjectsList = subjectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubjects(subjectsList);

      // Fetch Departments (For Dropdown)
      const deptQuery = query(
        collection(db, "schools", school.id, "departments"),
        orderBy("name"),
      );
      const deptSnapshot = await getDocs(deptQuery);
      setDepartments(
        deptSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );

      // Fetch Grades (For Checkboxes)
      const gradesQuery = query(
        collection(db, "schools", school.id, "grades"),
        orderBy("name"),
      );
      const gradesSnapshot = await getDocs(gradesQuery);
      setGrades(
        gradesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );

      // Fetch Allocations (For Validation)
      const allocSnapshot = await getDocs(
        collection(db, "schools", school.id, "allocations"),
      );
      setAllocations(
        allocSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id]);

  // 2. Add or Edit Logic
  const handleSave = async (formData) => {
    setIsSubmitting(true);
    try {
      const collectionRef = collection(db, "schools", school.id, "subjects");

      const payload = {
        name: formData.name,
        departmentId: formData.departmentId,
        departmentName: formData.departmentName,
        gradeIds: formData.gradeIds, // Maintain for indexing/filtering
        gradeDetails: formData.gradeDetails, // New Structure: [{id, name, periods}, ...]
        // Keeping gradeNames for backward compatibility if needed
        gradeNames: formData.gradeDetails.map((g) => g.name),
        updatedAt: new Date(),
      };

      if (editingSubject) {
        await updateDoc(
          doc(db, "schools", school.id, "subjects", editingSubject.id),
          payload,
        );
      } else {
        await addDoc(collectionRef, {
          ...payload,
          createdAt: new Date(),
        });
      }

      await fetchData(); // Refresh all lists
      handleCloseModal();
    } catch (error) {
      console.error("Error saving subject:", error);
      alert("Failed to save subject.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    // Check for allocations before deleting the entire subject
    const hasAllocations = allocations.some((a) => a.subjectId === id);
    if (hasAllocations) {
      alert(
        `Cannot delete "${name}". It has active teacher allocations. Please remove them in the Allocations page first.`,
      );
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteDoc(doc(db, "schools", school.id, "subjects", id));
        setSubjects((prev) => prev.filter((s) => s.id !== id));
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  // Modal Handlers
  const openAddModal = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">Loading subjects...</div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Subject Management
          </h2>
          <p className="text-sm text-gray-500">
            Manage subjects, assign to departments, and set periods per class.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={18} />
          Add Subject
        </button>
      </div>

      {/* Empty State */}
      {subjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen className="text-blue-500" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No subjects yet</h3>
          <p className="text-gray-500 text-sm mt-1">
            Start by adding subjects like Math, Science, or English.
          </p>
        </div>
      ) : (
        /* Data Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 text-blue-700 p-2 rounded-lg shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                      {subject.name}
                    </h3>
                    <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">
                      {subject.departmentName || "No Department"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(subject)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id, subject.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-400 mb-2">
                  Taught in (Periods):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {/* Prioritize new data structure (gradeDetails) */}
                  {subject.gradeDetails && subject.gradeDetails.length > 0 ? (
                    subject.gradeDetails.map((detail, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {detail.name}
                        {detail.periods > 0 && (
                          <span className="ml-1 text-gray-400">
                            ({detail.periods})
                          </span>
                        )}
                      </span>
                    ))
                  ) : subject.gradeNames && subject.gradeNames.length > 0 ? (
                    // Fallback for old data without periods
                    subject.gradeNames.map((gradeName, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {gradeName}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      No classes assigned
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <SubjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        initialData={editingSubject}
        isSubmitting={isSubmitting}
        departments={departments}
        grades={grades}
        allocations={allocations} // Passing allocations for validation
      />
    </div>
  );
};

export default Subjects;
