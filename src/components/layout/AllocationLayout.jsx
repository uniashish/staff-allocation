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
          <div className="flex justify-between h-16">
            {/* Left Side: Back Nav + School Title */}
            <div className="flex items-center">
              {/* Back Button Group */}
              <Link
                to="/dashboard"
                className="group flex items-center gap-2 text-brand-teal hover:text-teal-700 transition-colors mr-8"
              >
                <span className="text-2xl transform group-hover:-translate-x-1 transition-transform">
                  ←
                </span>
                <span className="text-sm font-medium">Dashboard</span>
              </Link>

              {/* Vertical Divider (Optional visual separation, remove if unwanted) */}
              <div className="h-8 w-px bg-gray-200 mr-8 hidden sm:block"></div>

              {/* School Details Column - Ensures location is exactly under name */}
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  {school.name}
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  {school.location}
                </p>
              </div>
            </div>

            {/* Right Side: Navigation Tabs */}
            <nav className="flex space-x-4 sm:space-x-8 -mb-px ml-6 overflow-x-auto h-full">
              <NavTab to="overview" label="Overview" />
              <NavTab to="departments" label="Departments" />
              <NavTab to="classes" label="Classes" />
              <NavTab to="teachers" label="Teachers" />
              <NavTab to="subjects" label="Subjects" />
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

// Updated NavTab styling
const NavTab = ({ to, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
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
