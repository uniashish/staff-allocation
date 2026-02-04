/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-teal": "#00A9A9",
        "brand-orange": "#F49119",
        "brand-red": "#EA3722",
        "brand-dark": "#1A1A1A",
      },
    },
  },
  plugins: [],
};
