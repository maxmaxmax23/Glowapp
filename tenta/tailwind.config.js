/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Web "Tokens" mimicking Aurum Gluestack
        black: "#000000",
        backgroundDark900: "#171717", // neutral-900 equivalent
        backgroundDark950: "#0a0a0a", // neutral-950 equivalent
        amber400: "#fbbf24", // amber-400
        textLight50: "#fafafa", // neutral-50
        textDark400: "#a3a3a3", // neutral-400
        borderDark800: "#262626", // neutral-800
        red400: "#f87171",
        red500: "#ef4444",
        green500: "#22c55e",
        lime400: "#a3e635",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Oswald", "sans-serif"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { transform: "translateY(30px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        pulseSlow: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-in-out",
        slideUp: "slideUp 0.3s ease-in-out",
        pulseSlow: "pulseSlow 1.5s ease-in-out infinite",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      spacing: {
        "80": "20rem",
        "96": "24rem",
      },
    },
    screens: {
      // Mobile-first: everything defaults to small screens
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};
