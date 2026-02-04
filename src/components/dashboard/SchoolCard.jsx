import React from "react";
import { useNavigate } from "react-router-dom";

export const SchoolCard = ({ school, userRole, onDelete, onEdit }) => {
  const isViewer = userRole === "viewer";
  const navigate = useNavigate();

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex-grow">
        <h2 className="text-xl font-bold text-slate-900 mb-2">{school.name}</h2>
        <p className="text-gray-500 text-sm mb-6">
          {school.location || "No location specified"}
        </p>
      </div>

      <div className="flex gap-2 mt-4">
        {/* ACTION: Navigate to the new Allocation Dashboard */}
        <button
          onClick={() => navigate(`/school/${school.id}`)}
          className="flex-1 bg-brand-teal text-white py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Open Allocation
        </button>

        {!isViewer && (
          <>
            <button
              className="p-2 text-gray-400 hover:text-brand-teal border border-gray-200 rounded-md transition-colors"
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
              className="p-2 text-gray-400 hover:text-brand-red border border-gray-200 rounded-md transition-colors"
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
