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
    if (!data.teachers.length) return null;

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
    const deptStats = data.departments
      .map((d) => {
        const deptTeachers = data.teachers.filter((t) =>
          t.departmentIds?.includes(d.id),
        );
        const totalCapacity = deptTeachers.reduce(
          (sum, t) => sum + (parseInt(t.maxLoad) || 30),
          0,
        );

        // Calc load specifically for this dept's subjects
        const deptSubjectIds = data.subjects
          .filter((s) => s.departmentId === d.id)
          .map((s) => s.id);
        const actualLoad = data.allocations
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
      .sort((a, b) => b.percentage - a.percentage); // Sort by highest utilization

    // 3. Overall Allocation Coverage
    // Rough estimate: Total Assigned Periods vs (Subjects * Grades * AvgPeriods)
    // Better: Iterate all subjects -> gradeDetails -> periods
    let totalRequiredPeriods = 0;
    data.subjects.forEach((s) => {
      if (s.gradeDetails) {
        s.gradeDetails.forEach((g) => {
          totalRequiredPeriods += parseInt(g.periods) || 0;
        });
      }
    });

    const totalAssignedPeriods = data.allocations.reduce(
      (sum, a) => sum + (parseInt(a.periodsPerWeek) || 0),
      0,
    );
    const coverage =
      totalRequiredPeriods > 0
        ? Math.round((totalAssignedPeriods / totalRequiredPeriods) * 100)
        : 0;

    return {
      teacherStatus: [
        { label: "Overloaded", value: overloaded, color: "#ef4444" }, // Red
        { label: "Optimal", value: optimal, color: "#22c55e" }, // Green
        { label: "Underloaded", value: underloaded, color: "#3b82f6" }, // Blue
        { label: "Unassigned", value: unassigned, color: "#e5e7eb" }, // Gray
      ],
      deptStats,
      coverage,
      totalStudents: data.grades.reduce(
        (sum, g) => sum + (parseInt(g.totalStudents) || 0),
        0,
      ),
    };
  }, [data]);

  if (!isOpen || !school) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="text-indigo-600" />
              {school.name}{" "}
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
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
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
            <div className="space-y-8">
              {/* Top Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Users size={18} />
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      Total Staff
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.teachers.length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Building2 size={18} />
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      Departments
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.departments.length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                      <BookOpen size={18} />
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      Subjects
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.subjects.length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <Users size={18} />
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      Students
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalStudents}
                  </p>
                </div>
              </div>

              {/* Main Charts Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Teacher Load Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <PieChart size={18} className="text-gray-400" /> Teacher
                    Utilization
                  </h3>
                  <div className="flex flex-col items-center">
                    <SimpleDonutChart data={stats.teacherStatus} />
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-8 w-full">
                      {stats.teacherStatus.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            ></span>
                            <span className="text-sm text-gray-600">
                              {item.label}
                            </span>
                          </div>
                          <span className="font-bold text-gray-900">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Department Allocation Bars */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <BarChart3 size={18} className="text-gray-400" /> Department
                    Capacity vs. Actual Load
                  </h3>
                  <div className="space-y-5">
                    {stats.deptStats.length === 0 && (
                      <p className="text-gray-400 italic">
                        No departments found.
                      </p>
                    )}
                    {stats.deptStats.map((dept, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            {dept.name}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {dept.load} / {dept.capacity} periods (
                            {dept.percentage}%)
                          </span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              dept.percentage > 100
                                ? "bg-red-500"
                                : dept.percentage > 80
                                  ? "bg-indigo-500"
                                  : "bg-blue-400"
                            }`}
                            style={{
                              width: `${Math.min(dept.percentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">
                        Total Assigned
                      </p>
                      <p className="text-xl font-bold text-indigo-600">
                        {data.allocations.reduce(
                          (s, a) => s + (parseInt(a.periodsPerWeek) || 0),
                          0,
                        )}{" "}
                        <span className="text-sm text-gray-400 font-normal">
                          pds
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">
                        Total Capacity
                      </p>
                      <p className="text-xl font-bold text-gray-700">
                        {data.teachers.reduce(
                          (s, t) => s + (parseInt(t.maxLoad) || 30),
                          0,
                        )}{" "}
                        <span className="text-sm text-gray-400 font-normal">
                          pds
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">
                        Unassigned
                      </p>
                      <p className="text-xl font-bold text-orange-500">
                        {data.teachers.reduce(
                          (s, t) => s + (parseInt(t.maxLoad) || 30),
                          0,
                        ) -
                          data.allocations.reduce(
                            (s, a) => s + (parseInt(a.periodsPerWeek) || 0),
                            0,
                          )}
                      </p>
                    </div>
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
