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
  Building2,
  BookOpen,
  Users,
  Clock,
} from "lucide-react";
import DepartmentModal from "./DepartmentModal";
import DepartmentDetailModal from "./DepartmentDetailModal";

const Departments = () => {
  const { school } = useOutletContext();

  // Data State
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [grades, setGrades] = useState([]); // Added Grades State
  const [loading, setLoading] = useState(true);

  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail View Modal State
  const [viewingDept, setViewingDept] = useState(null);

  // 1. Fetch All Related Data
  const fetchData = async () => {
    try {
      const [deptSnap, teachSnap, subjSnap, allocSnap, gradeSnap] =
        await Promise.all([
          getDocs(
            query(
              collection(db, "schools", school.id, "departments"),
              orderBy("name"),
            ),
          ),
          getDocs(collection(db, "schools", school.id, "teachers")),
          getDocs(collection(db, "schools", school.id, "subjects")),
          getDocs(collection(db, "schools", school.id, "allocations")),
          getDocs(collection(db, "schools", school.id, "grades")), // Fetch Grades
        ]);

      setDepartments(
        deptSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
      setTeachers(teachSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setSubjects(subjSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setAllocations(
        allocSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
      setGrades(gradeSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id]);

  // Helper: Calculate Progress & Stats for Department
  const getDeptStats = (deptId) => {
    let totalRequired = 0;
    const deptSubjects = subjects.filter((s) => s.departmentId === deptId);

    deptSubjects.forEach((subj) => {
      if (subj.gradeDetails) {
        subj.gradeDetails.forEach((g) => {
          totalRequired += parseInt(g.periods) || 0;
        });
      }
    });

    let totalAllocated = 0;
    const subjectIds = deptSubjects.map((s) => s.id);
    const deptAllocations = allocations.filter((a) =>
      subjectIds.includes(a.subjectId),
    );

    deptAllocations.forEach((a) => {
      totalAllocated += parseInt(a.periodsPerWeek) || 0;
    });

    const percentage =
      totalRequired > 0
        ? Math.min((totalAllocated / totalRequired) * 100, 100)
        : 0;

    return {
      totalRequired,
      totalAllocated,
      percentage,
      style: {
        background: `linear-gradient(90deg, #ecfdf5 ${percentage}%, #fef2f2 ${percentage}%)`,
      },
    };
  };

  // Save Logic
  const handleSave = async (formData) => {
    setIsSubmitting(true);
    try {
      const collectionRef = collection(db, "schools", school.id, "departments");
      if (editingDept) {
        await updateDoc(
          doc(db, "schools", school.id, "departments", editingDept.id),
          { ...formData, updatedAt: new Date() },
        );
      } else {
        await addDoc(collectionRef, { ...formData, createdAt: new Date() });
      }
      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving department:", error);
      alert("Failed to save department.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Logic
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteDoc(doc(db, "schools", school.id, "departments", id));
        setDepartments((prev) => prev.filter((d) => d.id !== id));
      } catch (error) {
        console.error("Error deleting department:", error);
      }
    }
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Departments</h2>
          <p className="text-sm text-gray-500">
            Manage academic departments and faculties.
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

      {departments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building2 className="text-blue-500" size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No departments found
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Create your first department to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const teacherCount = teachers.filter(
              (t) => t.departmentIds && t.departmentIds.includes(dept.id),
            ).length;

            const subjectCount = subjects.filter(
              (s) => s.departmentId === dept.id,
            ).length;

            const stats = getDeptStats(dept.id);

            return (
              <div
                key={dept.id}
                onClick={() => setViewingDept(dept)}
                style={stats.style}
                className="p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {dept.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium uppercase tracking-wide">
                          <span className="flex items-center gap-1">
                            <Users size={12} /> {teacherCount} Staff
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen size={12} /> {subjectCount} Subjs
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(dept);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white/50 rounded-md"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(dept.id, dept.name);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white/50 rounded-md"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Clock
                        size={16}
                        className={
                          stats.totalAllocated === stats.totalRequired
                            ? "text-green-600"
                            : "text-gray-400"
                        }
                      />
                      <span className="text-2xl font-bold text-gray-900">
                        {stats.totalAllocated}
                      </span>
                      <span className="text-sm text-gray-500 font-medium self-end mb-1">
                        / {stats.totalRequired} periods
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DepartmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        initialData={editingDept}
        isSubmitting={isSubmitting}
      />

      <DepartmentDetailModal
        isOpen={!!viewingDept}
        onClose={() => setViewingDept(null)}
        department={viewingDept}
        teachers={teachers}
        subjects={subjects}
        allocations={allocations}
        grades={grades} // Passed Grades here
      />
    </div>
  );
};

export default Departments;
