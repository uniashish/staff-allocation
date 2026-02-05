import React, { useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase/firebaseUtils";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Auth Provider: Initializing listener...");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          console.log("Auth: User detected:", user.email);

          // 1. Try to fetch the specific user document
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log("Auth: Firestore Profile Found:", userData);

            // Success: Merge Auth User + Database Data
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              ...userData, // This injects 'role', 'name', etc.
            });
          } else {
            console.warn(
              "Auth: User logged in, but NO DOCUMENT found in 'users' collection.",
            );
            console.warn("Creating fallback user object...");

            // FALLBACK: Assign a placeholder role so the UI doesn't hang on "Loading..."
            setCurrentUser({
              ...user,
              role: "guest", // Prevents infinite loading, but won't give admin access
              name: user.displayName || "Guest User",
            });
          }
        } else {
          console.log("Auth: User signed out.");
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Auth Error:", error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
