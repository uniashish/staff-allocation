import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseUtils";
import {
  X,
  Shield,
  User,
  Clock,
  Loader2,
  CheckCircle2,
  Trash2,
  AlertCircle, // For Pending Icon
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const UserManagementModal = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort: Pending users first, then by Name
      userList.sort((a, b) => {
        if (a.role === "pending" && b.role !== "pending") return -1;
        if (a.role !== "pending" && b.role === "pending") return 1;
        return (a.name || "").localeCompare(b.name || "");
      });

      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUser.uid) {
      alert("You cannot change your own role.");
      return;
    }

    setUpdatingId(userId);
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role: newRole });

      setUsers((prev) => {
        const updated = prev.map((u) =>
          u.id === userId ? { ...u, role: newRole } : u,
        );
        // Re-sort after change? Optional, but keeping list stable is usually better UX
        return updated;
      });
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId, userRole) => {
    if (userId === currentUser.uid) {
      alert("You cannot delete your own account.");
      return;
    }

    if (userRole === "super_admin") {
      alert("Super Admin users cannot be deleted.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingId(userId);
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Shield className="text-indigo-600" size={20} />
              User Management
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage access levels and approve pending users
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Loader2
                size={32}
                className="animate-spin mb-3 text-indigo-500"
              />
              <p>Loading users...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Last Login</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const isPending = user.role === "pending";
                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors ${
                        isPending ? "bg-orange-50/60" : "hover:bg-gray-50/50"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border ${
                              isPending
                                ? "bg-orange-100 text-orange-600 border-orange-200"
                                : "bg-indigo-100 text-indigo-600 border-indigo-200"
                            }`}
                          >
                            {user.name ? (
                              user.name.charAt(0).toUpperCase()
                            ) : (
                              <User size={16} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm flex items-center gap-2">
                              {user.name || "Unknown Name"}
                              {isPending && (
                                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                  New
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <select
                            value={user.role || "pending"}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value)
                            }
                            disabled={
                              user.id === currentUser.uid ||
                              updatingId === user.id
                            }
                            className={`text-sm border rounded-lg px-3 py-1.5 pr-8 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none w-36 ${
                              isPending
                                ? "bg-orange-50 text-orange-700 border-orange-200 font-bold"
                                : user.role === "super_admin"
                                  ? "bg-purple-50 text-purple-700 border-purple-200 font-medium"
                                  : "bg-white text-gray-700 border-gray-200"
                            }`}
                          >
                            {/* Include 'pending' so we can see the current state properly */}
                            <option value="pending" disabled>
                              Pending Approval
                            </option>
                            <option value="viewer">Viewer</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          {/* Custom Dropdown Arrow */}
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg
                              width="10"
                              height="6"
                              viewBox="0 0 10 6"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M1 1L5 5L9 1"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock size={14} className="text-gray-400" />
                          {user.lastLogin ? (
                            new Date(
                              user.lastLogin.seconds * 1000,
                            ).toLocaleDateString()
                          ) : (
                            <span className="text-gray-400 italic text-xs">
                              Never
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {updatingId === user.id ? (
                            <span className="inline-flex items-center gap-1 text-xs text-indigo-600 animate-pulse">
                              <Loader2 size={12} className="animate-spin" />{" "}
                              Updating...
                            </span>
                          ) : deletingId === user.id ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 animate-pulse">
                              <Loader2 size={12} className="animate-spin" />{" "}
                              Deleting...
                            </span>
                          ) : (
                            <>
                              {user.role !== "super_admin" &&
                                user.id !== currentUser.uid && (
                                  <button
                                    onClick={() =>
                                      handleDeleteUser(user.id, user.role)
                                    }
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete User"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}

                              {isPending ? (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100 ml-2">
                                  <AlertCircle size={12} /> Pending
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 ml-2">
                                  <CheckCircle2 size={12} /> Active
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
          <p>Total Users: {users.length}</p>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagementModal;
