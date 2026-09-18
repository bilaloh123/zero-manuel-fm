/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Cairo", "system-ui", "sans-serif"],
      },
      colors: {
        sidebar: {
          DEFAULT: "#0F2A22",
          dark: "#0C221B",
          hover: "#2C4437",
          active: "#2E7D58",
          text: "#F5F7F5",
          muted: "#A9BDB4",
        },
        cream: {
          DEFAULT: "#FAF7F0",
          soft: "#F3EEE1",
        },
        brand: {
          50: "#E9F3EE",
          100: "#CBE3D6",
          300: "#7FB79D",
          500: "#0F2A22",
          600: "#0C221B",
          700: "#081712",
        },
        ink: {
          DEFAULT: "#1F2A27",
          muted: "#6B7A75",
          faint: "#9AA9A4",
        },
        border: {
          DEFAULT: "#E7E1D2",
        },
      },
      borderRadius: {
        card: "1rem",
        control: "0.75rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(26, 58, 46, 0.03), 0 2px 8px rgba(26, 58, 46, 0.04)",
        sidebar: "2px 0 12px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
