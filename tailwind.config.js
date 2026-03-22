/** @type {import('tailwindcss').Config} */
export default {
  darkmode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2563EB",
          dark: "#1E40AF",
          soft: "#DBEAFE",
        },
        background: "#F8FAFC",
        surface: "#FFFFFF",
        text: {
          primary: "#0F172A",
          secondary: "#475569",
          muted: "#94A3B8",
        },
        border: "#E2E8F0",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        soft: "0 10px 25px rgba(0,0,0,0.06)",
        hover: "0 18px 40px rgba(0,0,0,0.12)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
