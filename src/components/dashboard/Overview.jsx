import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseUtils";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  BookOpen,
  TrendingUp,
  Activity,
  ArrowRight,
  AlertOctagon,
} from "lucide-react";

const Overview = () => {
  const { school } = useOutletContext();
  const [loading, setLoading] = useState(true);

  // Data State
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (school?.id) fetchDashboardData();
  }, [school?.id]);

  const fetchDashboardData = async () => {
    try {
      const [teachSnap, subjSnap, allocSnap, deptSnap] = await Promise.all([
        getDocs(collection(db, "schools", school.id, "teachers")),
        getDocs(collection(db, "schools", school.id, "subjects")),
        getDocs(collection(db, "schools", school.id, "allocations")),
        getDocs(collection(db, "schools", school.id, "departments")),
      ]);

      setTeachers(teachSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setSubjects(subjSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAllocations(allocSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDepartments(deptSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ANALYTICS LOGIC ---

  const stats = useMemo(() => {
    if (loading) return null;

    // 1. Alert: Overloaded Teachers
    const overloadedTeachers = teachers.filter((t) => {
      const currentLoad = allocations
        .filter((a) => a.teacherId === t.id)
        .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);
      const maxLoad = parseInt(t.maxLoad) || 30;
      return currentLoad > maxLoad;
    });

    // 2. Alert: Unassigned / Under-assigned Classes
    let unassignedCount = 0;
    subjects.forEach((subj) => {
      if (subj.gradeDetails) {
        subj.gradeDetails.forEach((gradeDetail) => {
          const required = parseInt(gradeDetail.periods) || 0;
          if (required > 0) {
            const assigned = allocations
              .filter(
                (a) => a.subjectId === subj.id && a.gradeId === gradeDetail.id,
              )
              .reduce((sum, a) => sum + (parseInt(a.periodsPerWeek) || 0), 0);

            if (assigned < required) {
              unassignedCount++;
            }
          }
        });
      }
    });

    // 3. Department Utilization Gauges
    const deptStats = departments.map((dept) => {
      // Find teachers in this department
      const deptTeachers = teachers.filter(
        (t) => t.departmentIds && t.departmentIds.includes(dept.id),
      );

      // Total Capacity (Supply)
      const totalCapacity = deptTeachers.reduce(
        (sum, t) => sum + (parseInt(t.maxLoad) || 30),
        0,
      );

      // Total Allocated (Used)
      const totalAllocated = deptTeachers.reduce((sum, t) => {
        const load = allocations
          .filter((a) => a.teacherId === t.id)
          .reduce((s, a) => s + (parseInt(a.periodsPerWeek) || 0), 0);
        return sum + load;
      }, 0);

      const percentage =
        totalCapacity > 0
          ? Math.round((totalAllocated / totalCapacity) * 100)
          : 0;

      return {
        ...dept,
        teacherCount: deptTeachers.length,
        totalCapacity,
        totalAllocated,
        percentage,
      };
    });

    return {
      overloadedTeachers,
      unassignedCount,
      deptStats,
    };
  }, [teachers, subjects, allocations, departments, loading]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
          <p className="text-gray-500">
            Real-time health check of your school's staffing allocations.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="../allocations"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            Go to Matrix
          </Link>
        </div>
      </div>

      {/* ALERTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Overloaded Teachers Alert */}
        <div
          className={`p-5 rounded-xl border flex items-start gap-4 shadow-sm transition-all
          ${
            stats.overloadedTeachers.length > 0
              ? "bg-red-50 border-red-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <div
            className={`p-3 rounded-full shrink-0 ${stats.overloadedTeachers.length > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
          >
            {stats.overloadedTeachers.length > 0 ? (
              <AlertOctagon size={24} />
            ) : (
              <CheckCircle2 size={24} />
            )}
          </div>
          <div className="flex-1">
            <h3
              className={`text-lg font-bold ${stats.overloadedTeachers.length > 0 ? "text-red-900" : "text-green-900"}`}
            >
              {stats.overloadedTeachers.length > 0
                ? `${stats.overloadedTeachers.length} Teachers Overloaded`
                : "Staff Workload Healthy"}
            </h3>
            <p
              className={`text-sm mt-1 ${stats.overloadedTeachers.length > 0 ? "text-red-700" : "text-green-700"}`}
            >
              {stats.overloadedTeachers.length > 0
                ? "Some teachers have exceeded their maximum weekly period limit."
                : "All teachers are operating within their defined capacity limits."}
            </p>
            {stats.overloadedTeachers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {stats.overloadedTeachers.slice(0, 5).map((t) => (
                  <span
                    key={t.id}
                    className="text-xs font-bold bg-white text-red-800 px-2 py-1 rounded border border-red-100 shadow-sm"
                  >
                    {t.name}
                  </span>
                ))}
                {stats.overloadedTeachers.length > 5 && (
                  <span className="text-xs text-red-600 self-center">
                    + {stats.overloadedTeachers.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
          {stats.overloadedTeachers.length > 0 && (
            <Link
              to="../teachers"
              className="text-sm font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 self-center"
            >
              Fix <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {/* Unassigned Classes Alert */}
        <div
          className={`p-5 rounded-xl border flex items-start gap-4 shadow-sm transition-all
          ${
            stats.unassignedCount > 0
              ? "bg-orange-50 border-orange-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <div
            className={`p-3 rounded-full shrink-0 ${stats.unassignedCount > 0 ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}
          >
            {stats.unassignedCount > 0 ? (
              <AlertTriangle size={24} />
            ) : (
              <BookOpen size={24} />
            )}
          </div>
          <div className="flex-1">
            <h3
              className={`text-lg font-bold ${stats.unassignedCount > 0 ? "text-orange-900" : "text-green-900"}`}
            >
              {stats.unassignedCount > 0
                ? `${stats.unassignedCount} Classes Unassigned`
                : "All Classes Covered"}
            </h3>
            <p
              className={`text-sm mt-1 ${stats.unassignedCount > 0 ? "text-orange-700" : "text-green-700"}`}
            >
              {stats.unassignedCount > 0
                ? "Several subjects have classes that do not meet the required period count."
                : "Every subject has been fully allocated to teachers."}
            </p>
          </div>
          {stats.unassignedCount > 0 && (
            <Link
              to="../allocations"
              className="text-sm font-semibold text-orange-600 hover:text-orange-800 flex items-center gap-1 self-center"
            >
              Assign <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* DEPARTMENT UTILIZATION GAUGES */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="text-blue-600" size={20} /> Department
          Utilization
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {stats.deptStats.map((dept) => {
            // Color Logic
            let color = "bg-blue-500";
            let textColor = "text-blue-700";
            let status = "Healthy";

            if (dept.percentage > 95) {
              color = "bg-red-500";
              textColor = "text-red-700";
              status = "Critical";
            } else if (dept.percentage > 85) {
              color = "bg-orange-500";
              textColor = "text-orange-700";
              status = "High";
            } else if (dept.percentage < 50) {
              color = "bg-gray-400";
              textColor = "text-gray-600";
              status = "Low";
            } else {
              color = "bg-green-500";
              textColor = "text-green-700";
              status = "Optimal";
            }

            return (
              <div
                key={dept.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{dept.name}</h3>
                    <p className="text-xs text-gray-500">
                      {dept.teacherCount} Teachers
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded bg-opacity-10 ${textColor.replace("text-", "bg-")} ${textColor}`}
                  >
                    {status}
                  </span>
                </div>

                {/* Gauge / Progress Bar */}
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {dept.percentage}%
                  </span>
                  <span className="text-sm text-gray-500 mb-1">capacity</span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-1000 ${color}`}
                    style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                  ></div>
                </div>

                <div className="mt-auto pt-2 flex justify-between text-xs text-gray-400 border-t border-gray-50">
                  <span>Used: {dept.totalAllocated}</span>
                  <span>Max: {dept.totalCapacity}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Overview;
