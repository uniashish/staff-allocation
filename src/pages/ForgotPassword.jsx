import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebaseUtils.js";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    if (!email) {
      setStatus({ type: "error", message: "Please enter your email address." });
      setLoading(false);
      return;
    }

    // Optional: Configure where the user goes after clicking the email link
    // You can remove this object if you just want default Firebase behavior
    const actionCodeSettings = {
      url: window.location.origin + "/login", // Redirects back to login after reset
      handleCodeInApp: true,
    };

    try {
      await sendPasswordResetEmail(auth, email, actionCodeSettings);

      // NOTE: If the email doesn't exist, Firebase might not throw an error
      // due to "Email Enumeration Protection". It will just look like success.
      setStatus({
        type: "success",
        message:
          "If an account exists with this email, a reset link has been sent.",
      });
      setEmail("");
    } catch (error) {
      console.error("Reset Error:", error);

      let errorMsg = "Failed to send reset link.";

      // Note: This error code often won't trigger in newer Firebase projects
      // because of security settings, but we keep it just in case.
      if (error.code === "auth/user-not-found") {
        errorMsg = "No account found with this email.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "Please enter a valid email address.";
      }

      setStatus({
        type: "error",
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-sm text-gray-500 mt-2">
            Enter your email to receive a password reset link
          </p>
        </div>

        {/* Status Message */}
        {status.message && (
          <div
            className={`mb-6 p-3 text-xs rounded-lg text-center font-semibold border ${
              status.type === "success"
                ? "bg-green-100 border-green-500 text-green-700"
                : "bg-brand-red/10 border-brand-red text-brand-red"
            }`}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-5">
          <Input
            label="Email Address"
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

          <Button type="submit" disabled={loading} variant="primary">
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-gray-100">
          <Link
            to="/login"
            className="text-brand-teal font-bold hover:underline text-sm"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
