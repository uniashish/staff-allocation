export const Button = ({ children, variant = "primary", ...props }) => {
  const variants = {
    // Using your Teal as the primary action color
    primary: "bg-brand-teal text-white hover:opacity-90 shadow-md",
    // Using your Orange for secondary actions or Google login
    secondary: "border border-gray-300 hover:bg-gray-50 text-slate-900",
    // Using your Red for danger/delete actions later
    danger: "bg-brand-red text-white hover:opacity-90",
  };

  return (
    <button
      {...props}
      className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-3 ${variants[variant]}`}
    >
      {children}
    </button>
  );
};
