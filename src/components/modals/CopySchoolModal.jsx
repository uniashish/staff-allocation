import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseUtils";
import { Loader2, Copy, CheckSquare, Square } from "lucide-react";

const CopySchoolModal = ({ isOpen, onClose, schools, onSchoolCreated }) => {
  const [step, setStep] = useState(1); // 1: Select School, 2: Select Data, 3: Review & Name
  const [selectedSourceSchoolId, setSelectedSourceSchoolId] = useState("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newLocation, setNewLocation] = useState("");

  // Data from Source School
  const [sourceDepartments, setSourceDepartments] = useState([]);
  const [sourceSubjects, setSourceSubjects] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Selection State
  const [selectedDeptIds, setSelectedDeptIds] = useState(new Set());
  const [selectedSubjectIds, setSelectedSubjectIds] = useState(new Set());

  const [isCopying, setIsCopying] = useState(false);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedSourceSchoolId("");
      setNewSchoolName("");
      setNewLocation("");
      setSourceDepartments([]);
      setSourceSubjects([]);
      setSelectedDeptIds(new Set());
      setSelectedSubjectIds(new Set());
    }
  }, [isOpen]);

  // Fetch Data when Source School is Selected
  const handleSchoolSelect = async () => {
    if (!selectedSourceSchoolId) return;
    setLoadingData(true);
    try {
      const [deptSnap, subjSnap] = await Promise.all([
        getDocs(
          collection(db, "schools", selectedSourceSchoolId, "departments"),
        ),
        getDocs(collection(db, "schools", selectedSourceSchoolId, "subjects")),
      ]);

      const depts = deptSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const subjs = subjSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setSourceDepartments(depts);
      setSourceSubjects(subjs);

      // Default: Select All
      setSelectedDeptIds(new Set(depts.map((d) => d.id)));
      setSelectedSubjectIds(new Set(subjs.map((s) => s.id)));

      setStep(2);
    } catch (error) {
      console.error("Error fetching source school data:", error);
      alert("Failed to load school data.");
    } finally {
      setLoadingData(false);
    }
  };

  // Toggle Handlers
  const toggleDept = (id) => {
    const newSet = new Set(selectedDeptIds);
    if (newSet.has(id)) {
      newSet.delete(id);
      // Auto-deselect subjects from this dept
      const deptSubjects = sourceSubjects.filter((s) => s.departmentId === id);
      const newSubjSet = new Set(selectedSubjectIds);
      deptSubjects.forEach((s) => newSubjSet.delete(s.id));
      setSelectedSubjectIds(newSubjSet);
    } else {
      newSet.add(id);
    }
    setSelectedDeptIds(newSet);
  };

  const toggleSubject = (id) => {
    const newSet = new Set(selectedSubjectIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSubjectIds(newSet);
  };

  const toggleAllDepts = () => {
    if (selectedDeptIds.size === sourceDepartments.length) {
      setSelectedDeptIds(new Set());
      setSelectedSubjectIds(new Set());
    } else {
      setSelectedDeptIds(new Set(sourceDepartments.map((d) => d.id)));
      // Optional: Auto-select all subjects too? Usually yes for "Select All"
    }
  };

  // Final Copy Logic
  const handleCopy = async (e) => {
    e.preventDefault();
    setIsCopying(true);

    try {
      // 1. Create New School Document
      const schoolRef = await addDoc(collection(db, "schools"), {
        name: newSchoolName,
        location: newLocation,
        createdAt: new Date(),
        copiedFrom: selectedSourceSchoolId,
      });

      const newSchoolId = schoolRef.id;
      const batch = writeBatch(db);

      // 2. Map Old IDs to New IDs (to maintain relationships)
      const deptIdMap = {}; // oldId -> newId

      // 3. Copy Departments
      const deptsToCopy = sourceDepartments.filter((d) =>
        selectedDeptIds.has(d.id),
      );
      for (const dept of deptsToCopy) {
        const newDeptRef = doc(
          collection(db, "schools", newSchoolId, "departments"),
        );
        deptIdMap[dept.id] = newDeptRef.id; // Store mapping
        batch.set(newDeptRef, {
          name: dept.name,
          createdAt: new Date(),
        });
      }

      // 4. Copy Subjects (Only if their department is also copied)
      const subjsToCopy = sourceSubjects.filter(
        (s) =>
          selectedSubjectIds.has(s.id) && selectedDeptIds.has(s.departmentId),
      );

      for (const subj of subjsToCopy) {
        const newSubjRef = doc(
          collection(db, "schools", newSchoolId, "subjects"),
        );
        const newDeptId = deptIdMap[subj.departmentId]; // Get new parent ID

        if (newDeptId) {
          // We need to clean up gradeDetails if grades aren't copied
          // For simplicity, we assume we copy subject Metadata but NOT allocations/grades logic unless we copy Grades too.
          // Requirement asked for "Departments and Subjects".
          // If Grades are part of school structure, they should be copied too or reset.
          // Assuming basic copy for now:
          batch.set(newSubjRef, {
            name: subj.name,
            departmentId: newDeptId,
            createdAt: new Date(),
            // Resetting grade-specific details as grades are school-specific and might not exist yet
            gradeDetails: [],
            gradeIds: [],
          });
        }
      }

      await batch.commit();

      // 5. Done
      onSchoolCreated({
        id: newSchoolId,
        name: newSchoolName,
        location: newLocation,
      });
      onClose();
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Failed to copy school. " + error.message);
    } finally {
      setIsCopying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Copy size={20} className="text-indigo-600" />
            Copy School Structure
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: Choose Source */}
          {step === 1 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Select School to Copy From
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={selectedSourceSchoolId}
                onChange={(e) => setSelectedSourceSchoolId(e.target.value)}
              >
                <option value="">-- Select a School --</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* STEP 2: Select Data */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800">Select Data to Copy</h3>
                <button
                  onClick={toggleAllDepts}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {selectedDeptIds.size === sourceDepartments.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              {sourceDepartments.length === 0 ? (
                <p className="text-gray-500 italic">
                  No departments found in source school.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sourceDepartments.map((dept) => {
                    const isDeptSelected = selectedDeptIds.has(dept.id);
                    const deptSubjects = sourceSubjects.filter(
                      (s) => s.departmentId === dept.id,
                    );

                    return (
                      <div
                        key={dept.id}
                        className={`border rounded-lg p-3 transition-all ${isDeptSelected ? "border-indigo-200 bg-indigo-50/30" : "border-gray-200 opacity-70"}`}
                      >
                        {/* Dept Checkbox */}
                        <div
                          className="flex items-center gap-2 cursor-pointer mb-2"
                          onClick={() => toggleDept(dept.id)}
                        >
                          {isDeptSelected ? (
                            <CheckSquare
                              size={18}
                              className="text-indigo-600"
                            />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                          <span
                            className={`font-bold ${isDeptSelected ? "text-indigo-900" : "text-gray-500"}`}
                          >
                            {dept.name}
                          </span>
                        </div>

                        {/* Subject List */}
                        <div className="pl-6 space-y-1">
                          {deptSubjects.map((subj) => (
                            <div
                              key={subj.id}
                              className="flex items-center gap-2 cursor-pointer text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDeptSelected) toggleSubject(subj.id);
                              }}
                            >
                              {selectedSubjectIds.has(subj.id) ? (
                                <CheckSquare
                                  size={14}
                                  className={
                                    isDeptSelected
                                      ? "text-indigo-500"
                                      : "text-gray-300"
                                  }
                                />
                              ) : (
                                <Square size={14} className="text-gray-300" />
                              )}
                              <span
                                className={
                                  selectedSubjectIds.has(subj.id)
                                    ? "text-gray-700"
                                    : "text-gray-400"
                                }
                              >
                                {subj.name}
                              </span>
                            </div>
                          ))}
                          {deptSubjects.length === 0 && (
                            <span className="text-xs text-gray-400 italic">
                              No subjects
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Finalize */}
          {step === 3 && (
            <form id="copyForm" onSubmit={handleCopy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New School Name
                </label>
                <input
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Eastside High (Copy)"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Springfield"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800 mt-4">
                <strong>Summary:</strong>
                <br />
                Copying from:{" "}
                <u>
                  {schools.find((s) => s.id === selectedSourceSchoolId)?.name}
                </u>
                <br />
                Departments: {selectedDeptIds.size}
                <br />
                Subjects: {selectedSubjectIds.size}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((prev) => prev - 1)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
            >
              Back
            </button>
          )}

          {step === 1 && (
            <button
              onClick={handleSchoolSelect}
              disabled={!selectedSourceSchoolId || loadingData}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {loadingData && <Loader2 size={16} className="animate-spin" />}
              Next
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={selectedDeptIds.size === 0}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold disabled:opacity-50"
            >
              Next: School Details
            </button>
          )}

          {step === 3 && (
            <button
              type="submit"
              form="copyForm"
              disabled={isCopying}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {isCopying ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Creating...
                </>
              ) : (
                "Create School"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CopySchoolModal;
