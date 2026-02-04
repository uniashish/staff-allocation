export const Input = ({ label, icon, ...props }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-3 top-3 text-gray-400">{icon}</span>
      <input
        {...props}
        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none text-sm transition-all"
      />
    </div>
  </div>
);
