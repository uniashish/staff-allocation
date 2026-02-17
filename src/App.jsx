import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import DashboardLayout from "./components/layout/DashboardLayout";

// --- NEW IMPORTS ---
import AllocationLayout from "./components/layout/AllocationLayout";
// import SchoolOverview from "./pages/allocation/SchoolOverview"; // <--- REMOVE OR COMMENT OUT THIS
import Overview from "./components/dashboard/Overview"; // <--- ADD THIS (Import your new Command Center)

import Departments from "./components/departments/Departments";
import Classes from "./components/classes/Classes";
import Subjects from "./components/subjects/Subjects";
import Teachers from "./components/teachers/Teachers";
import Allocations from "./components/allocations/Allocations";
import SupplyDemand from "./components/analytics/SupplyDemand";
import SmartAllocation from "./components/analytics/SmartAllocation"; // <--- NEW COMPONENT FOR SMART ALLOCATE
import WhatIfAnalysis from "./components/analytics/WhatIfAnalysis";
// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { currentUser, isPending, loading } = useAuth();

  if (loading) return <div className="p-4">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" />;
  if (isPending) return <Navigate to="/login" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* MAIN DASHBOARD (List of Schools) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            {/* ALLOCATION DASHBOARD (Nested Layout for Specific School) */}
            <Route
              path="/school/:schoolId"
              element={
                <ProtectedRoute>
                  <AllocationLayout />
                </ProtectedRoute>
              }
            >
              {/* Default redirects to overview */}
              <Route index element={<Navigate to="overview" replace />} />

              {/* UPDATE THIS ROUTE TO USE YOUR NEW COMPONENT */}
              <Route path="overview" element={<Overview />} />

              <Route path="departments" element={<Departments />} />

              {/* Placeholders for future features */}
              <Route path="teachers" element={<Teachers />} />
              <Route path="classes" element={<Classes />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="allocations" element={<Allocations />} />

              {/* Analytics Routes */}
              <Route
                path="analytics"
                element={<Navigate to="analytics/supply-demand" replace />}
              />
              <Route
                path="analytics/supply-demand"
                element={<SupplyDemand />}
              />
              <Route
                path="analytics/smart-allocate"
                element={<SmartAllocation />}
              />
              <Route path="analytics/what-if" element={<WhatIfAnalysis />} />
            </Route>

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
