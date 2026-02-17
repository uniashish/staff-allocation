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
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  BarChart2,
  User,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import SubjectModal from "./SubjectModal";
import SubjectDetailModal from "./SubjectDetailModal";

const Subjects = () => {
  const { school } = useOutletContext();
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [viewingSubject, setViewingSubject] = useState(null);

  // --- HELPER: Safely get periods (Handles inconsistencies in field names) ---
  const getPeriods = (allocation) => {
    return parseInt(allocation.periods || allocation.periodsPerWeek || 0);
  };

  // 1. Fetch All Required Data
  const fetchData = async () => {
    try {
      const subjectsQuery = query(
        collection(db, "schools", school.id, "subjects"),
        orderBy("name"),
      );
      const deptQuery = query(
        collection(db, "schools", school.id, "departments"),
        orderBy("name"),
      );
      const gradesQuery = query(
        collection(db, "schools", school.id, "grades"),
        orderBy("name"),
      );
      const teachersQuery = query(
        collection(db, "schools", school.id, "teachers"),
        orderBy("name"),
      );
      const allocQuery = collection(db, "schools", school.id, "allocations");

      const [subSnap, deptSnap, grdSnap, teachSnap, allocSnap] =
        await Promise.all([
          getDocs(subjectsQuery),
          getDocs(deptQuery),
          getDocs(gradesQuery),
          getDocs(teachersQuery),
          getDocs(allocQuery),
        ]);

      setSubjects(subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setDepartments(
        deptSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
      setGrades(grdSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setTeachers(teachSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setAllocations(
        allocSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
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

  // 2. Save Logic
  const handleSave = async (formData) => {
    setIsSubmitting(true);
    try {
      const collectionRef = collection(db, "schools", school.id, "subjects");
      const payload = {
        name: formData.name,
        departmentId: formData.departmentId,
        departmentName: formData.departmentName,
        gradeIds: formData.gradeIds,
        gradeDetails: formData.gradeDetails,
        gradeNames: formData.gradeDetails.map((g) => g.name),
        updatedAt: new Date(),
      };

      if (editingSubject) {
        await updateDoc(
          doc(db, "schools", school.id, "subjects", editingSubject.id),
          payload,
        );
      } else {
        await addDoc(collectionRef, { ...payload, createdAt: new Date() });
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving subject:", error);
      alert("Failed to save subject.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    const hasAllocations = allocations.some((a) => a.subjectId === id);
    if (hasAllocations) {
      alert(`Cannot delete "${name}". It has active teacher allocations.`);
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
            Manage subjects and monitor teacher allocations.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={18} /> Add Subject
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {subjects.map((subject) => {
          // --- CALCULATIONS ---
          // 1. Total Required Periods
          const totalRequired = (subject.gradeDetails || []).reduce(
            (sum, g) => sum + (parseInt(g.periods) || 0),
            0,
          );

          // 2. Total Allocated Periods
          const subjectAllocations = allocations.filter(
            (a) => a.subjectId === subject.id,
          );
          const totalAllocated = subjectAllocations.reduce(
            (sum, a) => sum + getPeriods(a),
            0,
          );

          // 3. Progress
          const percentage =
            totalRequired > 0
              ? Math.min(100, (totalAllocated / totalRequired) * 100)
              : 0;

          // 4. Assigned Teachers
          const assignedTeacherIds = [
            ...new Set(subjectAllocations.map((a) => a.teacherId)),
          ];
          const assignedTeachers = assignedTeacherIds
            .map((id) => teachers.find((t) => t.id === id))
            .filter(Boolean);

          // --- STYLING LOGIC (GREEN / RED THEME) ---
          let statusColor = "bg-green-600"; // Default Solid Color
          let progressBg = "bg-green-50"; // Default Fill Color (Light)
          let textColor = "text-green-700"; // Default Text Color
          let iconColor = "text-green-500"; // Default Icon Color

          if (totalRequired === 0) {
            // Not Configured -> Gray
            statusColor = "bg-gray-300";
            progressBg = "bg-gray-100";
            textColor = "text-gray-500";
            iconColor = "text-gray-400";
          } else if (totalAllocated > totalRequired) {
            // Over Allocated -> Red
            statusColor = "bg-red-500";
            progressBg = "bg-red-50";
            textColor = "text-red-700";
            iconColor = "text-red-500";
          } else {
            // Normal Progress or Complete -> Green
            statusColor = "bg-green-600";
            progressBg = "bg-green-100";
            textColor = "text-green-800";
            iconColor = "text-green-600";
          }

          return (
            <div
              key={subject.id}
              onClick={() => setViewingSubject(subject)}
              className="group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
            >
              {/* --- PROGRESS BACKGROUND FILL --- */}
              <div
                className={`absolute top-0 left-0 bottom-0 transition-all duration-700 ease-in-out ${progressBg}`}
                style={{ width: `${percentage}%` }}
              />

              {/* Top Border Indicator */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${statusColor}`}
              />

              {/* --- CARD CONTENT --- */}
              <div className="relative z-10 p-5 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-green-700 transition-colors">
                      {subject.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {subject.departmentName || "No Dept"}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {totalRequired > 0 && totalAllocated === totalRequired ? (
                    <CheckCircle className={iconColor} size={20} />
                  ) : totalAllocated > totalRequired ? (
                    <AlertCircle className={iconColor} size={20} />
                  ) : null}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">
                      Allocated
                    </p>
                    <p className={`text-2xl font-black ${textColor}`}>
                      {totalAllocated}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-bold">
                      Required
                    </p>
                    <p className="text-2xl font-black text-gray-700">
                      {totalRequired}
                    </p>
                  </div>
                </div>

                {/* Teachers Section (Push to bottom) */}
                <div className="mt-auto pt-4 border-t border-gray-100/50 flex items-center justify-between">
                  {/* Teacher Avatars */}
                  <div className="flex -space-x-2">
                    {assignedTeachers.length > 0 ? (
                      assignedTeachers.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          className="h-8 w-8 rounded-full ring-2 ring-white bg-green-100 flex items-center justify-center text-xs font-bold text-green-800"
                          title={t.name}
                        >
                          {t.name.charAt(0)}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        No Teachers
                      </span>
                    )}
                    {assignedTeachers.length > 3 && (
                      <div className="h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        +{assignedTeachers.length - 3}
                      </div>
                    )}
                  </div>

                  {/* Actions (Hidden by default, show on hover) */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(subject);
                      }}
                      className="p-1.5 bg-white text-gray-500 hover:text-green-600 rounded-md shadow-sm border border-gray-200"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(subject.id, subject.name);
                      }}
                      className="p-1.5 bg-white text-gray-500 hover:text-red-600 rounded-md shadow-sm border border-gray-200"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {subjects.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <BookOpen className="text-gray-300 mx-auto mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-900">No subjects yet</h3>
          <p className="text-gray-500 text-sm">
            Add a subject to start assigning teachers.
          </p>
        </div>
      )}

      {/* Modals */}
      <SubjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        initialData={editingSubject}
        isSubmitting={isSubmitting}
        departments={departments}
        grades={grades}
        allocations={allocations}
        subjects={subjects}
      />

      <SubjectDetailModal
        isOpen={!!viewingSubject}
        onClose={() => setViewingSubject(null)}
        subject={viewingSubject}
        allocations={allocations}
        teachers={teachers}
      />
    </div>
  );
};

export default Subjects;
