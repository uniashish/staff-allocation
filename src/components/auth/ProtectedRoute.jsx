import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth"; // A custom hook we'll build

export const ProtectedRoute = ({ children }) => {
  const { user, loading, userData } = useAuth();

  if (loading)
    return <div className="flex justify-center p-10">Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  if (userData && !userData.isApproved) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-brand-red">Access Pending</h2>
          <p className="mt-2 text-gray-600">
            A Super Admin must approve your account before you can continue.
          </p>
        </div>
      </div>
    );
  }

  return children;
};
