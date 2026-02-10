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
  Clock,
} from "lucide-react";
import TeacherModal from "./TeacherModal";
import TeacherDetailModal from "./TeacherDetailModal";

const Teachers = () => {
  const { school } = useOutletContext();
  const { currentUser } = useAuth();

  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [viewingTeacher, setViewingTeacher] = useState(null);

  const canEdit = currentUser?.role === "super_admin";

  // 1. Fetch All Data
  const fetchData = async () => {
    try {
      // Parallel Fetch
      const [teachSnap, deptSnap, subjSnap, gradeSnap, allocSnap] =
        await Promise.all([
          getDocs(
            query(
              collection(db, "schools", school.id, "teachers"),
              orderBy("name"),
            ),
          ),
          getDocs(collection(db, "schools", school.id, "departments")),
          getDocs(collection(db, "schools", school.id, "subjects")),
          getDocs(collection(db, "schools", school.id, "grades")),
          getDocs(collection(db, "schools", school.id, "allocations")),
        ]);

      const rawTeachers = teachSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDepartments(
        deptSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
      setSubjects(subjSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setGrades(gradeSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      const allocList = allocSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllocations(allocList);

      // SORT TEACHERS BASED ON ALLOCATED PERIODS (DESCENDING)
      const sortedTeachers = rawTeachers
        .map((teacher) => {
          const currentLoad = allocList
            .filter((a) => a.teacherId === teacher.id)
            .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);
          return { ...teacher, currentLoad }; // Attach load for sorting
        })
        .sort((a, b) => b.currentLoad - a.currentLoad); // Sort Descending

      setTeachers(sortedTeachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id]);

  // Helper: Calculate Load Stats & Style
  const getTeacherStats = (teacherId, maxLoad) => {
    const currentLoad = allocations
      .filter((a) => a.teacherId === teacherId)
      .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

    const max = parseInt(maxLoad) || 30;
    const percentage = Math.min((currentLoad / max) * 100, 100);

    return {
      currentLoad,
      max,
      percentage: Math.round((currentLoad / max) * 100),
      style: {
        background: `linear-gradient(90deg, #bbf7d0 ${percentage}%, #fecaca ${percentage}%)`,
      },
    };
  };

  // Save Logic
  const handleSave = async (formData) => {
    setIsSubmitting(true);
    try {
      const collectionRef = collection(db, "schools", school.id, "teachers");
      if (editingTeacher) {
        await updateDoc(
          doc(db, "schools", school.id, "teachers", editingTeacher.id),
          { ...formData, updatedAt: new Date() },
        );
      } else {
        await addDoc(collectionRef, { ...formData, createdAt: new Date() });
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

  // Delete Logic (Updated with Check)
  const handleDelete = async (id, name) => {
    // 1. Check for allocations
    const hasAllocations = allocations.some((a) => a.teacherId === id);

    if (hasAllocations) {
      alert(
        `Cannot delete ${name} because they have active class allocations. Please remove their classes first.`,
      );
      return;
    }

    // 2. Proceed if safe
    if (window.confirm(`Delete ${name}?`)) {
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
      <div className="p-8 text-center text-gray-500">Loading teachers...</div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Teachers</h2>
          <p className="text-sm text-gray-500">Manage faculty and workload.</p>
        </div>
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

      {/* Grid Layout */}
      {teachers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="text-blue-500" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No teachers found
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Add your first teacher to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher) => {
            // Get Departments
            const teacherDepts =
              teacher.departmentIds && teacher.departmentIds.length > 0
                ? departments
                    .filter((d) => teacher.departmentIds.includes(d.id))
                    .map((d) => d.name)
                : [];

            // Get Stats
            const stats = getTeacherStats(teacher.id, teacher.maxLoad);

            return (
              <div
                key={teacher.id}
                onClick={() => setViewingTeacher(teacher)}
                style={stats.style}
                className="p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex gap-3 w-full">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                      {teacher.name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-900 truncate pr-2">
                          {teacher.name}
                        </h3>
                        {/* Percentage Badge */}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shadow-sm shrink-0 
                            ${stats.percentage > 100 ? "bg-red-600 text-white border-red-700" : "bg-white text-gray-700 border-gray-200"}`}
                        >
                          {stats.percentage}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Building2 size={12} />
                        <span className="truncate">
                          {teacherDepts.length > 0
                            ? teacherDepts.join(", ")
                            : "No Dept"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                        <Clock
                          size={12}
                          className={
                            stats.currentLoad > stats.max
                              ? "text-red-500"
                              : "text-green-600"
                          }
                        />
                        <span>
                          {stats.currentLoad} / {stats.max} periods
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Only for Super Admin) */}
                  {canEdit && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0 p-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(teacher);
                        }}
                        className="p-1.5 bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md border border-gray-200 shadow-sm"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(teacher.id, teacher.name);
                        }}
                        className="p-1.5 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md border border-gray-200 shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Subject Tags with Period Counts */}
                <div className="mt-3 relative z-10 pl-[52px]">
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.subjectNames && teacher.subjectNames.length > 0 ? (
                      teacher.subjectNames.slice(0, 3).map((subjName, idx) => {
                        // Find matching subject to get ID
                        const subjectObj = subjects.find(
                          (s) => s.name === subjName,
                        );
                        // Calculate load for this specific subject
                        const subjectLoad = subjectObj
                          ? allocations
                              .filter(
                                (a) =>
                                  a.teacherId === teacher.id &&
                                  a.subjectId === subjectObj.id,
                              )
                              .reduce(
                                (sum, a) =>
                                  sum + (parseInt(a.periodsPerWeek) || 0),
                                0,
                              )
                          : 0;

                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/80 border border-gray-200 text-gray-700 backdrop-blur-sm"
                          >
                            {subjName}
                            <span
                              className={`ml-1 font-bold ${subjectLoad > 0 ? "text-blue-600" : "text-gray-400"}`}
                            >
                              ({subjectLoad})
                            </span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">
                        No subjects assigned
                      </span>
                    )}
                    {teacher.subjectNames &&
                      teacher.subjectNames.length > 3 && (
                        <span className="text-[10px] text-gray-500 px-1">
                          + {teacher.subjectNames.length - 3}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Add Modal */}
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

      {/* Detail View Modal */}
      <TeacherDetailModal
        isOpen={!!viewingTeacher}
        onClose={() => setViewingTeacher(null)}
        teacher={viewingTeacher}
        allocations={allocations}
      />
    </div>
  );
};

export default Teachers;
