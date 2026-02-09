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
        {/* CHANGED: Switched from max-w-7xl to w-[90%] to use 90% screen width */}
        <div className="w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left Side: School Info */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link
                  to="/dashboard"
                  className="text-gray-400 hover:text-gray-500 transition-colors mr-4"
                >
                  &larr; Back
                </Link>
              </div>
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

      {/* CHANGED: Switched from max-w-7xl to w-[90%] to maximize screen usage */}
      <main className="flex-1 w-[90%] mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet context={{ school }} />
      </main>
    </div>
  );
};

// NavTab styling
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
