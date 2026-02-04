import React, { useEffect, useState } from "react";
import {
  Outlet,
  useParams,
  NavLink,
  useNavigate,
  Link,
} from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseUtils";

const AllocationLayout = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const docRef = doc(db, "schools", schoolId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSchool({ id: docSnap.id, ...docSnap.data() });
        } else {
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching school:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchool();
  }, [schoolId, navigate]);

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading School Context...
      </div>
    );
  if (!school) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Changed: Added h-16 and flex layout to put everything in one row */}
          <div className="flex justify-between h-16">
            {/* Left Side: Back Button & School Info */}
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Back
              </Link>

              {/* Vertical Divider */}
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  {school.name}
                </h1>
                {/* Optional: Hide location on very small screens if needed */}
                <p className="text-xs text-slate-500 hidden sm:block">
                  {school.location}
                </p>
              </div>
            </div>

            {/* Right Side: Navigation Tabs */}
            {/* Added ml-4 to separate from title, flex items-center to align, h-full to make borders sit at bottom */}
            <nav className="flex space-x-4 sm:space-x-8 -mb-px ml-6 overflow-x-auto h-full">
              <NavTab to="overview" label="Overview" />
              <NavTab to="departments" label="Departments" />
              <NavTab to="classes" label="Classes" />
              <NavTab to="teachers" label="Teachers" />
              <NavTab to="allocations" label="Allocations" />
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet context={{ school }} />
      </main>
    </div>
  );
};

// Updated NavTab styling for side-by-side layout
const NavTab = ({ to, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      // Changed: 'inline-flex items-center px-1 pt-1' ensures text is centered but border is at bottom
      `inline-flex items-center whitespace-nowrap px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
        isActive
          ? "border-brand-teal text-brand-teal"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`
    }
  >
    {label}
  </NavLink>
);

export default AllocationLayout;
