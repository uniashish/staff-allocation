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
import SchoolOverview from "./pages/allocation/SchoolOverview";
import Departments from "./components/departments/Departments";
import Classes from "./components/classes/Classes";
import Subjects from "./components/subjects/Subjects";
import Teachers from "./components/teachers/Teachers";
import Allocations from "./components/allocations/Allocations";

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

            {/* MAIN DASHBOARD (School Selection) */}
            <Route
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

              <Route path="overview" element={<SchoolOverview />} />
              <Route path="departments" element={<Departments />} />

              {/* Placeholders for future features */}
              <Route path="teachers" element={<Teachers />} />
              <Route path="classes" element={<Classes />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="allocations" element={<Allocations />} />
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
