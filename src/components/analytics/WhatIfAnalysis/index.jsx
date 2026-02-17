import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  setDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase/firebaseUtils";
import { useAuth } from "../../../context/AuthContext";
import { RotateCcw, Check, Loader } from "lucide-react";

import ChangeBuilder from "./ChangeBuilder";
import ImpactSummary from "./ImpactSummary";
import ImpactMatrix from "./ImpactMatrix";
import { applyShadowChanges, computeImpact } from "./shadowEngine";

const WhatIfAnalysis = () => {
  const { school } = useOutletContext();
  const { currentUser } = useAuth();

  // ── Data state ──
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Scenario state ──
  const [changes, setChanges] = useState([]);
  const [isApplying, setIsApplying] = useState(false);

  const canEdit = currentUser?.role === "super_admin";

  // ── Fetch all data ──
  const fetchData = async () => {
    try {
      const [gradeSnap, subjSnap, teachSnap, allocSnap, deptSnap] =
        await Promise.all([
          getDocs(
            query(
              collection(db, "schools", school.id, "grades"),
              orderBy("name"),
            ),
          ),
          getDocs(
            query(
              collection(db, "schools", school.id, "subjects"),
              orderBy("name"),
            ),
          ),
          getDocs(
            query(
              collection(db, "schools", school.id, "teachers"),
              orderBy("name"),
            ),
          ),
          getDocs(collection(db, "schools", school.id, "allocations")),
          getDocs(collection(db, "schools", school.id, "departments")),
        ]);

      setGrades(gradeSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSubjects(subjSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTeachers(teachSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAllocations(allocSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDepartments(deptSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (school?.id) fetchData();
  }, [school?.id]);

  // ── Compute shadow state & impact ──
  const shadowAllocations = useMemo(
    () => applyShadowChanges(allocations, changes, teachers),
    [allocations, changes, teachers],
  );

  const impact = useMemo(
    () =>
      computeImpact(
        allocations,
        shadowAllocations,
        teachers,
        changes,
        grades,
        subjects,
      ),
    [allocations, shadowAllocations, teachers, changes, grades, subjects],
  );

  // ── Handlers ──
  const handleAddChange = (change) => {
    setChanges((prev) => [...prev, change]);
  };

  const handleRemoveChange = (id) => {
    setChanges((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm("Clear all changes in this scenario?")) {
      setChanges([]);
    }
  };

  const handleApplyChanges = async () => {
    if (!canEdit) return;
    if (changes.length === 0) return;

    const confirmed = window.confirm(
      `Apply ${changes.length} change${changes.length !== 1 ? "s" : ""} to the live allocation data?\n\nThis will permanently update Firestore and cannot be undone.`,
    );
    if (!confirmed) return;

    setIsApplying(true);
    try {
      const batch = writeBatch(db);

      // Step 1: Apply all reassign changes
      changes
        .filter((c) => c.type === "reassign")
        .forEach((change) => {
          const {
            fromTeacherId,
            toTeacherId,
            gradeId,
            subjectId,
            periods,
            gradeName,
            subjectName,
            toTeacherName,
          } = change;

          // 1a. Reduce or remove FROM allocation
          const fromAllocId = `${gradeId}_${subjectId}_${fromTeacherId}`;
          const fromAlloc = allocations.find((a) => a.id === fromAllocId);

          if (fromAlloc) {
            const newPeriods =
              (parseInt(fromAlloc.periodsPerWeek) || 0) - periods;
            if (newPeriods <= 0) {
              // Delete entirely
              batch.delete(
                doc(db, "schools", school.id, "allocations", fromAllocId),
              );
            } else {
              // Update periods
              batch.update(
                doc(db, "schools", school.id, "allocations", fromAllocId),
                {
                  periodsPerWeek: newPeriods,
                  updatedAt: new Date(),
                },
              );
            }
          }

          // 1b. Add or increase TO allocation
          const toAllocId = `${gradeId}_${subjectId}_${toTeacherId}`;
          const toAlloc = allocations.find((a) => a.id === toAllocId);

          if (toAlloc) {
            // Increase existing
            const newPeriods =
              (parseInt(toAlloc.periodsPerWeek) || 0) + periods;
            batch.update(
              doc(db, "schools", school.id, "allocations", toAllocId),
              {
                periodsPerWeek: newPeriods,
                updatedAt: new Date(),
              },
            );
          } else {
            // Create new allocation
            const toTeacher = teachers.find((t) => t.id === toTeacherId);
            batch.set(doc(db, "schools", school.id, "allocations", toAllocId), {
              gradeId,
              gradeName: gradeName || "",
              subjectId,
              subjectName: subjectName || "",
              teacherId: toTeacherId,
              teacherName: toTeacherName || toTeacher?.name || "",
              periodsPerWeek: periods,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        });

      // Step 2: Apply all maxload changes
      changes
        .filter((c) => c.type === "maxload")
        .forEach((change) => {
          const { teacherId, newMaxLoad } = change;
          batch.update(doc(db, "schools", school.id, "teachers", teacherId), {
            maxLoad: newMaxLoad,
            updatedAt: new Date(),
          });
        });

      await batch.commit();

      // Refetch data and reset scenario
      await fetchData();
      setChanges([]);
      alert("Changes applied successfully!");
    } catch (error) {
      console.error("Error applying changes:", error);
      alert("Failed to apply changes. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader size={24} className="animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading scenario builder...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Header ── */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900">What-If Analysis</h2>
          <p className="text-sm text-gray-600">
            Build scenarios to visualize the impact of allocation changes before
            applying them.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleClearAll}
            disabled={changes.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>

          {canEdit && (
            <button
              onClick={handleApplyChanges}
              disabled={changes.length === 0 || isApplying}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
            >
              {isApplying ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Apply Changes
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Main layout: Left panel + Right panel ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* LEFT: Change Builder */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-4 overflow-y-auto shadow-sm">
          <ChangeBuilder
            grades={grades}
            subjects={subjects}
            teachers={teachers}
            realAllocations={allocations}
            changes={changes}
            onAddChange={handleAddChange}
            onRemoveChange={handleRemoveChange}
            onClearAll={handleClearAll}
          />
        </div>

        {/* RIGHT: Impact Preview */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
          {/* Impact Summary */}
          <div className="shrink-0">
            <ImpactSummary
              summary={impact.summary}
              teacherImpacts={impact.teacherImpacts}
              changes={changes}
            />
          </div>

          {/* Impact Matrix */}
          <div className="flex-1 min-h-0">
            <ImpactMatrix
              grades={grades}
              subjects={subjects}
              teachers={teachers}
              realAllocations={allocations}
              shadowAllocations={shadowAllocations}
              cellImpacts={impact.cellImpacts}
              teacherImpacts={impact.teacherImpacts}
              changes={changes}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatIfAnalysis;
