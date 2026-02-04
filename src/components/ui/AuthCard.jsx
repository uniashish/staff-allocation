export const AuthCard = ({ children, title, subtitle, logoAlt }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-[440px]">
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden border-4 border-brand-orange shadow-sm">
          <img
            src="https://via.placeholder.com/80"
            alt={logoAlt}
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-2xl font-bold text-brand-dark">{title}</h1>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  </div>
);
