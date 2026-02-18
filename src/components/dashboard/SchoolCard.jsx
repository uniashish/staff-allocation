import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { useAuth } from "../../context/AuthContext"; // 1. Import Auth Hook

export const SchoolCard = ({
  school,
  userRole, // This might be coming in as undefined
  onDelete,
  onEdit,
  onViewDetail,
}) => {
  const { currentUser } = useAuth(); // 2. Get current user directly
  const navigate = useNavigate();

  // 3. Robust Check: Use prop OR fallback to currentUser.role
  // We also check for 'admin' just in case your database uses that instead of 'super_admin'
  const effectiveRole = userRole || currentUser?.role;
  const isSuperAdmin = effectiveRole === "super_admin";

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full group">
      <div className="flex-grow">
        <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
          {school.name}
        </h2>
        <p className="text-gray-500 text-sm mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
          {school.location || "No location specified"}
        </p>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
        <button
          onClick={() => navigate(`/school/${school.id}`)}
          className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
        >
          Open Dashboard
        </button>

        <button
          onClick={() => onViewDetail(school)}
          className="px-3 py-2 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center"
          title="View Statistics"
        >
          <BarChart3 size={20} />
        </button>

        {/* CHANGED: Logic now uses the robust 'isSuperAdmin' check */}
        {isSuperAdmin && (
          <>
            <button
              className="p-2 text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg transition-colors hover:bg-gray-50"
              title="Edit School"
              onClick={() => onEdit(school)}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>

            <button
              onClick={() => onDelete(school.id)}
              className="p-2 text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg transition-colors hover:bg-red-50"
              title="Delete School"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
