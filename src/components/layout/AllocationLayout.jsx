import React, { useEffect, useState, useRef } from "react";
import {
  Outlet,
  useParams,
  NavLink,
  useNavigate,
  Link,
  useLocation,
} from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseUtils";
import { BarChart3, ChevronDown } from "lucide-react";

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
      {/* Increased z-index to ensure dropdown floats above page content */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
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
            {/* REMOVED 'overflow-x-auto' to allow dropdown to show */}
            <nav className="flex space-x-4 sm:space-x-8 -mb-px ml-6 h-full">
              <NavTab to="overview" label="Overview" />

              <NavDropdown
                label="Analytics"
                icon={
                  <BarChart3
                    size={16}
                    className="mr-1.5 inline-block -mt-0.5"
                  />
                }
                items={[
                  { label: "Supply-Demand Gap", to: "analytics/supply-demand" },
                ]}
              />

              <NavTab to="departments" label="Departments" />
              <NavTab to="classes" label="Classes" />
              <NavTab to="teachers" label="Teachers" />
              <NavTab to="subjects" label="Subjects" />
              <NavTab to="allocations" label="Allocations" />
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 w-[90%] mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-0">
        <Outlet context={{ school }} />
      </main>
    </div>
  );
};

// --- Sub-Components ---

const NavTab = ({ to, label, icon }) => (
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
    {icon}
    {label}
  </NavLink>
);

const NavDropdown = ({ label, icon, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  // Highlight parent if any child is active
  const isActive = items.some((item) => location.pathname.includes(item.to));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-flex items-center h-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors h-full outline-none ${
          isActive || isOpen
            ? "border-brand-teal text-brand-teal"
            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
        }`}
      >
        {icon}
        {label}
        <ChevronDown
          size={14}
          className={`ml-1 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-0 w-56 bg-white rounded-b-md shadow-xl border border-gray-100 ring-1 ring-black ring-opacity-5 py-1 z-[100]">
          {items.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-teal-50 text-teal-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50 hover:text-teal-600"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllocationLayout;
