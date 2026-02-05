import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebaseUtils";
import { useAuth } from "../../context/AuthContext"; // Import Auth Hook
import { LogOut, LayoutDashboard, User } from "lucide-react";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Get current user

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. Persistent Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left Side: App Title/Logo */}
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-brand-teal hover:text-teal-700 transition-colors"
              >
                <LayoutDashboard className="h-6 w-6" />
                <span className="text-xl font-bold text-gray-900">
                  SIS Staff Allocations
                </span>
              </Link>
            </div>

            {/* Right Side: User Name & Sign Out */}
            <div className="flex items-center gap-6">
              {/* User Name Display */}
              {currentUser && (
                <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-700">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <User size={16} />
                  </div>
                  <span>{currentUser.name || currentUser.email}</span>
                </div>
              )}

              {/* Separator */}
              <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. The specific page content renders here */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
