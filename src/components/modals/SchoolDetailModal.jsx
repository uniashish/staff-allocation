import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseUtils";
import {
  X,
  Users,
  BookOpen,
  Building2,
  BarChart3,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// --- Simple SVG Pie Chart (Donut) ---
const SimpleDonutChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let accumulatedDeg = 0;

  if (total === 0)
    return (
      <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
        No Data
      </div>
    );

  const gradientParts = data.map((item) => {
    const deg = (item.value / total) * 360;
    const str = `${item.color} ${accumulatedDeg}deg ${accumulatedDeg + deg}deg`;
    accumulatedDeg += deg;
    return str;
  });

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
      ></div>
      <div className="absolute inset-8 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
        <span className="text-2xl font-bold text-gray-800">{total}</span>
        <span className="text-[10px] text-gray-500 uppercase font-bold">
          Teachers
        </span>
      </div>
    </div>
  );
};

const SchoolDetailModal = ({ isOpen, onClose, school }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    teachers: [],
    subjects: [],
    departments: [],
    allocations: [],
    grades: [],
  });

  useEffect(() => {
    if (isOpen && school?.id) {
      fetchSchoolData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, school]);

  const fetchSchoolData = async () => {
    setLoading(true);
    try {
      const [tSnap, sSnap, dSnap, aSnap, gSnap] = await Promise.all([
        getDocs(collection(db, "schools", school.id, "teachers")),
        getDocs(collection(db, "schools", school.id, "subjects")),
        getDocs(collection(db, "schools", school.id, "departments")),
        getDocs(collection(db, "schools", school.id, "allocations")),
        getDocs(collection(db, "schools", school.id, "grades")),
      ]);

      setData({
        teachers: tSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        subjects: sSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        departments: dSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        allocations: aSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        grades: gSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      });
    } catch (err) {
      console.error("Error loading school details:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    if (!data || !data.teachers) return null;

    // 1. Teacher Workload Stats
    let overloaded = 0;
    let optimal = 0;
    let underloaded = 0;
    let unassigned = 0;

    data.teachers.forEach((t) => {
      const load = data.allocations
        .filter((a) => a.teacherId === t.id)
        .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

      const max = parseInt(t.maxLoad) || 30;

      if (load === 0) unassigned++;
      else if (load > max) overloaded++;
      else if (load >= max - 5)
        optimal++; // Within 5 periods of max is "Optimal"
      else underloaded++;
    });

    // 2. Department Stats
    const deptStats = (data.departments || [])
      .map((d) => {
        const deptTeachers = (data.teachers || []).filter((t) =>
          t.departmentIds?.includes(d.id),
        );
        const totalCapacity = deptTeachers.reduce(
          (sum, t) => sum + (parseInt(t.maxLoad) || 30),
          0,
        );

        const deptSubjectIds = (data.subjects || [])
          .filter((s) => s.departmentId === d.id)
          .map((s) => s.id);
        const actualLoad = (data.allocations || [])
          .filter((a) => deptSubjectIds.includes(a.subjectId))
          .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

        return {
          name: d.name,
          capacity: totalCapacity,
          load: actualLoad,
          percentage:
            totalCapacity > 0
              ? Math.round((actualLoad / totalCapacity) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    // 3. Overall Allocation Coverage
    let totalRequiredPeriods = 0;
    (data.subjects || []).forEach((s) => {
      if (s.gradeDetails) {
        s.gradeDetails.forEach((g) => {
          totalRequiredPeriods += parseInt(g.periods) || 0;
        });
      }
    });

    const totalAssignedPeriods = (data.allocations || []).reduce(
      (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
      0,
    );
    const coverage =
      totalRequiredPeriods > 0
        ? Math.round((totalAssignedPeriods / totalRequiredPeriods) * 100)
        : 0;

    return {
      teacherStatus: [
        { label: "Overloaded", value: overloaded, color: "#ef4444" },
        { label: "Optimal", value: optimal, color: "#22c55e" },
        { label: "Underloaded", value: underloaded, color: "#3b82f6" },
        { label: "Unassigned", value: unassigned, color: "#e5e7eb" },
      ],
      deptStats,
      coverage,
      totalStudents: (data.grades || []).reduce(
        (sum, g) => sum + (parseInt(g.totalStudents) || 0),
        0,
      ),
    };
  }, [data]);

  // Additional derived data: teacher loads and recent allocations
  const derived = useMemo(() => {
    const teacherLoads = (data.teachers || []).map((t) => {
      const load = (data.allocations || [])
        .filter((a) => a.teacherId === t.id)
        .reduce((s, a) => s + (parseInt(a.periodsPerWeek) || 0), 0);
      return { ...t, load };
    });

    const recentAllocations = [...(data.allocations || [])]
      .sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 10);

    return { teacherLoads, recentAllocations };
  }, [data]);

  if (!isOpen || !school) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="text-indigo-600" />
              {school.name}
              <span className="text-gray-400 font-normal text-lg">
                | Statistics
              </span>
            </h2>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-4">
              <span>{school.location}</span>
              {stats && (
                <span className="flex items-center gap-1 text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
                  <Activity size={12} /> {stats.coverage}% Allocation Coverage
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Loader2
                size={40}
                className="animate-spin mb-4 text-indigo-500"
              />
              <p>Crunching the numbers...</p>
            </div>
          ) : !stats ? (
            <p className="text-center text-gray-500">
              No data available for this school.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Summary + Donut */}
                <div className="col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600">
                        School Summary
                      </h4>
                      <p className="text-xs text-gray-400">Quick overview</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Coverage</p>
                      <p className="text-xl font-bold text-indigo-600">
                        {stats.coverage}%
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center">
                    <SimpleDonutChart data={stats.teacherStatus} />
                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Teachers</p>
                          <p className="text-lg font-bold text-gray-800">
                            {data.teachers.length}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Departments</p>
                          <p className="text-lg font-bold text-gray-800">
                            {data.departments.length}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Subjects</p>
                          <p className="text-lg font-bold text-gray-800">
                            {data.subjects.length}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Students</p>
                          <p className="text-lg font-bold text-gray-800">
                            {stats.totalStudents}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">
                      Department Utilization
                    </h5>
                    <div className="space-y-3">
                      {stats.deptStats.slice(0, 6).map((d, i) => (
                        <div key={i} className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-700">{d.name}</span>
                            <span className="text-gray-500 text-xs">
                              {d.percentage}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500"
                              style={{
                                width: `${Math.min(d.percentage, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Middle: Teachers list with loads */}
                <div
                  className="col-span-1 lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-y-auto"
                  style={{ maxHeight: 420 }}
                >
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">
                    Teachers ({data.teachers.length})
                  </h5>
                  <div className="space-y-2">
                    {derived.teacherLoads.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        No teachers found.
                      </p>
                    ) : (
                      derived.teacherLoads.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-800">
                              {t.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {t.subjectIds?.length || 0} subjects
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">
                              {t.load} pds
                            </div>
                            <div className="text-xs text-gray-400">
                              Max {t.maxLoad || 30}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: Subjects + Recent Allocations */}
                <div
                  className="col-span-1 lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-y-auto"
                  style={{ maxHeight: 420 }}
                >
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">
                    Top Subjects ({data.subjects.length})
                  </h5>
                  <div className="space-y-2 mb-4">
                    {data.subjects.slice(0, 10).map((s) => {
                      const subjectAlloc = data.allocations
                        .filter((a) => a.subjectId === s.id)
                        .reduce(
                          (s1, a) => s1 + (parseInt(a.periodsPerWeek) || 0),
                          0,
                        );
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50"
                        >
                          <div className="text-sm text-gray-800">{s.name}</div>
                          <div className="text-xs text-gray-500">
                            {subjectAlloc} pds
                          </div>
                        </div>
                      );
                    })}
                    {data.subjects.length === 0 && (
                      <p className="text-xs text-gray-400">No subjects</p>
                    )}
                  </div>

                  <h5 className="text-sm font-semibold text-gray-700 mb-3">
                    Recent Allocations
                  </h5>
                  <div className="space-y-2">
                    {derived.recentAllocations.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        No recent allocations
                      </p>
                    ) : (
                      derived.recentAllocations.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50"
                        >
                          <div className="text-sm">
                            <div className="font-medium text-gray-800">
                              {a.teacherName || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {a.subjectName || "—"} • {a.gradeName || "—"}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-bold text-gray-900">
                              {parseInt(a.periodsPerWeek) ||
                                parseInt(a.periods) ||
                                0}{" "}
                              pds
                            </div>
                            <div className="text-xs text-gray-400">
                              {a.updatedAt
                                ? new Date(a.updatedAt).toLocaleDateString()
                                : ""}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailModal;
