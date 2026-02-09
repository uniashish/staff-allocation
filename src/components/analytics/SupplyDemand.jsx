import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseUtils";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Users,
  BookOpen,
} from "lucide-react";

const SupplyDemand = () => {
  const context = useOutletContext();
  // Safety check: Context might be null if used outside Outlet or before loaded
  const school = context?.school;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch if school ID exists
    if (school?.id) {
      fetchAndProcessData();
    } else {
      // If school isn't ready yet, keep loading or do nothing
      // If context itself is missing, stop loading
      if (context === null) setLoading(false);
    }
  }, [school?.id]);

  const fetchAndProcessData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Raw Data
      const [subjSnap, teachSnap, deptSnap] = await Promise.all([
        getDocs(collection(db, "schools", school.id, "subjects")),
        getDocs(collection(db, "schools", school.id, "teachers")),
        getDocs(collection(db, "schools", school.id, "departments")),
      ]);

      const subjects = subjSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const teachers = teachSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const departments = deptSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 2. Initialize Buckets
      const analysis = {};

      // Create buckets for each department
      departments.forEach((dept) => {
        if (dept && dept.name) {
          analysis[dept.name] = {
            id: dept.id,
            name: dept.name,
            demand: 0,
            supply: 0,
            subjects: [],
            teachers: [],
          };
        }
      });

      // Default bucket
      analysis["General"] = {
        id: "general",
        name: "General / Unassigned",
        demand: 0,
        supply: 0,
        subjects: [],
        teachers: [],
      };

      // 3. Calculate DEMAND
      subjects.forEach((subj) => {
        let subjectDemand = 0;
        if (subj.gradeDetails && Array.isArray(subj.gradeDetails)) {
          subjectDemand = subj.gradeDetails.reduce(
            (sum, g) => sum + (parseInt(g.periods) || 0),
            0,
          );
        }

        const bucketName = subj.departmentName || "General";
        // Safety: ensure bucket exists, otherwise put in General
        const targetBucket = analysis[bucketName] ? bucketName : "General";

        analysis[targetBucket].demand += subjectDemand;
        analysis[targetBucket].subjects.push({
          name: subj.name,
          periods: subjectDemand,
        });
      });

      // 4. Calculate SUPPLY
      teachers.forEach((teacher) => {
        const capacity = parseInt(teacher.maxLoad) || 30;
        let bucketName = "General";

        if (
          teacher.departmentNames &&
          Array.isArray(teacher.departmentNames) &&
          teacher.departmentNames.length > 0
        ) {
          bucketName = teacher.departmentNames[0];
        }

        const targetBucket = analysis[bucketName] ? bucketName : "General";

        analysis[targetBucket].supply += capacity;
        analysis[targetBucket].teachers.push({
          name: teacher.name,
          capacity: capacity,
        });
      });

      // 5. Convert to Array and Sort
      const results = Object.values(analysis)
        .filter((a) => a.demand > 0 || a.supply > 0)
        .sort((a, b) => b.demand - a.demand);

      setData(results);
    } catch (err) {
      console.error("Error analyzing supply/demand:", err);
      setError("Failed to load analysis data.");
    } finally {
      setLoading(false);
    }
  };

  if (!school) {
    return (
      <div className="p-8 text-center text-gray-400">
        Loading school context...
      </div>
    );
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          Analyzing capacity...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">
        <AlertCircle className="mx-auto mb-2" />
        {error}
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="text-blue-600" />
          Supply-Demand Gap Analysis
        </h2>
        <p className="text-gray-500 mt-1">
          Compare total periods required (Demand) vs. teacher capacity (Supply)
          per department.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">
            No data available. Add subjects and teachers to see analysis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.map((dept) => {
            const gap = dept.supply - dept.demand;
            const isDeficit = gap < 0;
            // Avoid division by zero
            const utilization =
              dept.supply > 0
                ? Math.round((dept.demand / dept.supply) * 100)
                : dept.demand > 0
                  ? 999
                  : 0;

            let statusColor = "bg-green-100 text-green-700 border-green-200";
            let progressColor = "bg-green-500";
            let StatusIcon = CheckCircle2;

            if (isDeficit) {
              statusColor = "bg-red-100 text-red-700 border-red-200";
              progressColor = "bg-red-500";
              StatusIcon = AlertCircle;
            } else if (utilization > 90) {
              statusColor = "bg-orange-100 text-orange-700 border-orange-200";
              progressColor = "bg-orange-500";
              StatusIcon = TrendingUp;
            }

            return (
              <div
                key={dept.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col"
              >
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {dept.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${statusColor}`}
                        >
                          <StatusIcon size={12} />
                          {isDeficit ? "Deficit" : "Surplus"}: {Math.abs(gap)}{" "}
                          Periods
                        </span>
                        <span className="text-xs text-gray-400">
                          {utilization}% Load
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {dept.demand}
                      </div>
                      <div className="text-xs text-gray-500 uppercase font-medium">
                        Demand
                      </div>
                    </div>
                  </div>

                  <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className="absolute top-0 left-0 h-full w-full bg-gray-100"></div>
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${progressColor}`}
                      style={{
                        width: `${Math.min((dept.demand / dept.supply) * 100, 100)}%`,
                      }}
                    ></div>
                    {isDeficit && dept.demand > 0 && (
                      <div
                        className="absolute top-0 bottom-0 border-r-2 border-dashed border-gray-400 z-10"
                        style={{
                          left: `${(dept.supply / dept.demand) * 100}%`,
                        }}
                        title="Max Capacity"
                      ></div>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 font-medium">
                    <span>0</span>
                    <span>Capacity: {dept.supply} periods</span>
                  </div>
                </div>

                <div className="flex-1 p-0 grid grid-cols-2 divide-x divide-gray-100 bg-gray-50/50">
                  <div className="p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <BookOpen size={14} /> Subject Demand
                    </h4>
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                      {dept.subjects.length > 0 ? (
                        dept.subjects.map((subj, i) => (
                          <li key={i} className="flex justify-between text-sm">
                            <span
                              className="text-gray-700 truncate pr-2"
                              title={subj.name}
                            >
                              {subj.name}
                            </span>
                            <span className="font-semibold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm text-xs">
                              {subj.periods}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-gray-400 italic">
                          No subjects
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Users size={14} /> Teacher Supply
                    </h4>
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                      {dept.teachers.length > 0 ? (
                        dept.teachers.map((t, i) => (
                          <li key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700 truncate pr-2">
                              {t.name}
                            </span>
                            <span className="font-semibold text-gray-500 text-xs">
                              {t.capacity}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-red-400 italic">
                          No teachers assigned
                        </li>
                      )}
                    </ul>
                    {dept.teachers.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Total Capacity
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          {dept.supply}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupplyDemand;
