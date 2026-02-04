import React from "react";
import { useOutletContext } from "react-router-dom";

const SchoolOverview = () => {
  const { school } = useOutletContext();
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold mb-4">Welcome to {school.name}</h2>
      <p className="text-gray-600">
        Select a tab from the menu above to start managing your school data.
      </p>
    </div>
  );
};

export default SchoolOverview;
