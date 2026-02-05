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
import { useAuth } from "../../context/AuthContext";
import {
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  Building2,
  BookOpen,
} from "lucide-react";
import TeacherModal from "./TeacherModal";

const Teachers = () => {
  const { school } = useOutletContext();
  const { currentUser } = useAuth();

  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- DEBUGGING START ---
  // Check the browser console (F12) to see the full object
  console.log("Current User Object:", currentUser);
  console.log("Detected Role:", currentUser?.role);

  // Strict check: Ensure role matches "super_admin" exactly
  const canEdit = currentUser?.role === "super_admin";
  // --- DEBUGGING END ---

  // 1. Fetch All Data
  const fetchData = async () => {
    try {
      // Fetch Departments
      const deptSnapshot = await getDocs(
        query(
          collection(db, "schools", school.id, "departments"),
          orderBy("name"),
        ),
      );
      const deptList = deptSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setDepartments(deptList);

      // Fetch Subjects
      const subjSnapshot = await getDocs(
        query(
          collection(db, "schools", school.id, "subjects"),
          orderBy("name"),
        ),
      );
      const subjList = subjSnapshot.docs.map((s) => ({
        id: s.id,
        ...s.data(),
      }));
      setSubjects(subjList);

      // Fetch Teachers
      const teacherSnapshot = await getDocs(
        query(
          collection(db, "schools", school.id, "teachers"),
          orderBy("name"),
        ),
      );
      const teacherList = teacherSnapshot.docs.map((t) => ({
        id: t.id,
        ...t.data(),
      }));
      setTeachers(teacherList);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id]);

  // 2. Save Logic
  const handleSave = async (formData) => {
    if (!canEdit) return;

    setIsSubmitting(true);
    try {
      const collectionRef = collection(db, "schools", school.id, "teachers");
      const payload = {
        ...formData,
        updatedAt: new Date(),
      };

      if (editingTeacher) {
        await updateDoc(
          doc(db, "schools", school.id, "teachers", editingTeacher.id),
          payload,
        );
      } else {
        await addDoc(collectionRef, {
          ...payload,
          createdAt: new Date(),
        });
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving teacher:", error);
      alert("Failed to save teacher.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Delete Logic
  const handleDelete = async (id, name) => {
    if (!canEdit) return;

    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteDoc(doc(db, "schools", school.id, "teachers", id));
        setTeachers((prev) => prev.filter((t) => t.id !== id));
      } catch (error) {
        console.error("Error deleting teacher:", error);
      }
    }
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const openEditModal = (teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading faculty data...
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Teacher Management
          </h2>
          <p className="text-sm text-gray-500">
            Manage faculty members, their departments, and assigned subjects.
          </p>
        </div>

        {/* Only show Add button if super_admin */}
        {canEdit && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus size={18} />
            Add Teacher
          </button>
        )}
      </div>

      {/* Empty State */}
      {teachers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="text-blue-500" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No teachers found
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {canEdit
              ? "Add your first teacher to get started."
              : "No teachers have been added yet."}
          </p>
        </div>
      ) : (
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col h-full"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 leading-tight">
                      {teacher.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {teacher.departmentNames &&
                        teacher.departmentNames.map((dept, i) => (
                          <span
                            key={i}
                            className="text-xs text-gray-500 flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded"
                          >
                            {dept}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Actions - Only visible to super_admin */}
                {canEdit && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(teacher)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(teacher.id, teacher.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Subjects List */}
              <div className="mt-auto pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <BookOpen size={12} /> Teaches:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {teacher.subjectNames && teacher.subjectNames.length > 0 ? (
                    teacher.subjectNames.map((subj, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-100"
                      >
                        {subj}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      No subjects assigned
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Always conditionally rendered */}
      {canEdit && (
        <TeacherModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSave}
          initialData={editingTeacher}
          isSubmitting={isSubmitting}
          departments={departments}
          subjects={subjects}
        />
      )}
    </div>
  );
};

export default Teachers;
