import React from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebaseUtils.js";
import { useAuth } from "../../context/AuthContext"; // Import Context

const Header = () => {
  const navigate = useNavigate();

  // Use Global State instead of fetching manually
  const { currentUser, userRole } = useAuth();

  // Safe fallbacks in case data isn't ready
  const userName = currentUser?.displayName || currentUser?.email || "User";
  const displayRole = userRole || "Loading...";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Side: Logo & School Context */}
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-brand-dark tracking-tight">
              SIS Staff Allocation
            </h1>

            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

            <div className="hidden md:flex flex-col">
              <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">
                Current Context
              </span>
              <span className="text-sm font-medium text-gray-700">
                No School Selected
              </span>
            </div>
          </div>

          {/* Right Side: User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-gray-900">{userName}</div>
              <div className="text-xs text-brand-teal font-medium uppercase tracking-wide">
                {displayRole}
              </div>
            </div>

            <div className="h-8 w-8 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-sm border border-brand-orange/20">
              {userName.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={handleLogout}
              className="ml-2 text-sm text-gray-500 hover:text-brand-red transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
