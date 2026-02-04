import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. Persistent Header */}
      <Header />

      {/* 2. The specific page content renders here */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
