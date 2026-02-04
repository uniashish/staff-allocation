import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseUtils.js";
import { useToast } from "../context/ToastContext"; // <--- 1. Import Hook

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Keep your existing customAlert state for critical inline errors
  const [customAlert, setCustomAlert] = useState(null);

  const navigate = useNavigate();
  const { addToast } = useToast(); // <--- 2. Initialize Hook

  const handleLogin = async (e) => {
    e.preventDefault();
    setCustomAlert(null);
    setLoading(true);

    try {
      // 1. Attempt Login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // ---------------------------------------------------------
      // CHECK 1: Is Email Verified?
      // ---------------------------------------------------------
      if (!user.emailVerified) {
        await signOut(auth);

        // Keep using inline alert for this specific error (Best UX)
        setCustomAlert({
          type: "warning",
          text: "Email not verified. Please check your inbox and click the verification link.",
        });

        setLoading(false);
        return;
      }

      // ---------------------------------------------------------
      // CHECK 2: Firestore Role Logic
      // ---------------------------------------------------------
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === "pending") {
          await signOut(auth);
          setCustomAlert({
            type: "error",
            text: "Account pending approval from administrator.",
          });
          setLoading(false);
          return;
        }
      }

      // 3. Success -> Use Toast here!
      addToast("Successfully logged in!", "success"); // <--- 3. Trigger Success Toast
      navigate("/dashboard");
    } catch (err) {
      console.error("Login Error:", err.message);

      let msg = "Invalid email or password.";
      if (err.code === "auth/user-not-found") msg = "Account not found.";
      if (err.code === "auth/wrong-password") msg = "Invalid password.";
      if (err.code === "auth/too-many-requests")
        msg = "Too many attempts. Try later.";

      // Use Toast for generic errors instead of blocking the UI
      addToast(msg, "error"); // <--- 4. Trigger Error Toast
    } finally {
      setLoading(false);
    }
  };

  // Helper to get styles based on type (Keeping your working code)
  const getAlertStyle = (type) => {
    const baseStyle = {
      padding: "15px",
      marginBottom: "20px",
      borderRadius: "6px",
      fontSize: "14px",
      lineHeight: "1.4",
      fontWeight: "500",
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
    };

    if (type === "warning") {
      return {
        ...baseStyle,
        backgroundColor: "#fff3cd",
        color: "#856404",
        border: "1px solid #ffeeba",
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: "#f8d7da",
        color: "#721c24",
        border: "1px solid #f5c6cb",
      };
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex justify-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            SIS Staff Allocation
          </h1>
        </div>

        <div className="text-center mb-6">
          <p className="text-sm text-gray-500">Sign in to continue</p>
        </div>

        {/* Keeping your robust inline alert for verification/pending errors */}
        {customAlert && (
          <div style={getAlertStyle(customAlert.type)}>
            <div style={{ flexShrink: 0, marginTop: "2px" }}>
              {customAlert.type === "warning" ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              )}
            </div>
            <div>{customAlert.text}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"
                />
              </svg>
            }
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
          />
          <Button type="submit" disabled={loading} variant="primary">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="flex justify-between mt-8 text-xs font-medium">
          <Link
            to="/forgot-password"
            className="text-gray-500 hover:text-black transition-colors"
          >
            Forgot password?
          </Link>
          <div className="text-gray-500">
            Need an account?{" "}
            <Link
              to="/signup"
              className="text-teal-600 font-bold hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
