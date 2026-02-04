import React, { useEffect } from "react";

export const AlertMessage = ({
  type = "info",
  message,
  onClose,
  floating = true,
}) => {
  if (!message) return null;

  // Auto-dismiss only if floating
  useEffect(() => {
    if (floating) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose, floating]);

  // fallback styles in case Tailwind is missing
  const colorMap = {
    success: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" }, // Green
    error: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" }, // Red
    info: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }, // Blue
  };

  const currentStyle = colorMap[type] || colorMap.info;

  const icons = {
    success: (
      <svg
        className="w-5 h-5"
        style={{ color: currentStyle.text }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
    error: (
      <svg
        className="w-5 h-5"
        style={{ color: currentStyle.text }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    info: (
      <svg
        className="w-5 h-5"
        style={{ color: currentStyle.text }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  const baseClasses =
    "flex items-start gap-3 px-4 py-3 rounded-lg border shadow-sm transition-all";
  const positionClasses = floating
    ? "fixed top-6 right-6 z-50 max-w-sm shadow-lg bg-white"
    : "w-full mb-6";

  return (
    <div
      className={`${baseClasses} ${positionClasses}`}
      style={{
        backgroundColor: currentStyle.bg,
        borderColor: currentStyle.border,
        color: currentStyle.text,
      }}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-grow">
        <p className="text-sm font-medium leading-5">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
      >
        <span className="text-xl leading-none">&times;</span>
      </button>
    </div>
  );
};
