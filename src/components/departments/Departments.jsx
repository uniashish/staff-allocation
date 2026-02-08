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
import DepartmentDetailModal from "./DepartmentDetailModal"; // Import the detail modal

const Departments = () => {
  const { school } = useOutletContext();

  // Data State
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
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
      // Fetch Departments
      const deptQuery = query(
        collection(db, "schools", school.id, "departments"),
        orderBy("name"),
      );
      const deptSnap = await getDocs(deptQuery);
      const deptList = deptSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDepartments(deptList);

      // Fetch Teachers (to count them)
      const teachSnap = await getDocs(
        collection(db, "schools", school.id, "teachers"),
      );
      const teachList = teachSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeachers(teachList);

      // Fetch Subjects (to count them)
      const subSnap = await getDocs(
        collection(db, "schools", school.id, "subjects"),
      );
      const subList = subSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubjects(subList);
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
      const collectionRef = collection(db, "schools", school.id, "departments");
      const payload = {
        name: formData.name,
        updatedAt: new Date(),
      };

      if (editingDept) {
        await updateDoc(
          doc(db, "schools", school.id, "departments", editingDept.id),
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
      console.error("Error saving department:", error);
      alert("Failed to save department.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Delete Logic
  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete ${name}?`)) {
      try {
        await deleteDoc(doc(db, "schools", school.id, "departments", id));
        setDepartments((prev) => prev.filter((d) => d.id !== id));
      } catch (error) {
        console.error("Error deleting:", error);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Departments</h2>
          <p className="text-sm text-gray-500">
            Manage school departments and view assigned staff.
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
            No departments defined
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Create departments to organize subjects and teachers.
          </p>
        </div>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => {
            // Calculate Counts
            const teacherCount = teachers.filter(
              (t) => t.departmentIds && t.departmentIds.includes(dept.id),
            ).length;
            const subjectCount = subjects.filter(
              (s) => s.departmentId === dept.id,
            ).length;

            return (
              <div
                key={dept.id}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="bg-blue-50 text-blue-700 p-2 rounded-lg">
                      <Building2 size={20} />
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(dept);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(dept.id, dept.name);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* THIS IS THE CLICKABLE BUTTON - REPLACES THE OLD H3 */}
                  <button
                    onClick={() => setViewingDept(dept)}
                    className="text-left font-semibold text-gray-900 text-lg hover:text-blue-600 hover:underline decoration-blue-300 underline-offset-4 transition-all focus:outline-none block w-full"
                  >
                    {dept.name}
                  </button>

                  <p className="text-sm text-gray-500 mt-2">
                    {teacherCount} {teacherCount === 1 ? "Teacher" : "Teachers"}{" "}
                    • {subjectCount}{" "}
                    {subjectCount === 1 ? "Subject" : "Subjects"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <DepartmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        initialData={editingDept}
        isSubmitting={isSubmitting}
      />

      {/* Detail View Modal */}
      <DepartmentDetailModal
        isOpen={!!viewingDept}
        onClose={() => setViewingDept(null)}
        department={viewingDept}
        teachers={teachers}
        subjects={subjects}
      />
    </div>
  );
};

export default Departments;
