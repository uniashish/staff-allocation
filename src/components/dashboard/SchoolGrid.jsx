import React from "react";
import { SchoolCard } from "./SchoolCard";

// 1. Accept 'onEdit' in the props
export const SchoolGrid = ({
  schools,
  loading,
  userRole,
  onRequestDelete,
  onEdit,
}) => {
  const isViewer = userRole === "viewer";

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-48 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200 mt-10">
        <p className="text-gray-400">
          {isViewer
            ? "No schools available to view."
            : 'No schools found. Click "Create New School" to get started.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {schools.map((school) => (
        <SchoolCard
          key={school.id}
          school={school}
          userRole={userRole}
          onDelete={onRequestDelete}
          onEdit={onEdit} // 2. Pass 'onEdit' down to the card
        />
      ))}
    </div>
  );
};
