/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172554",
        brand: "#2563eb",
        canvas: "#f8fafc",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
