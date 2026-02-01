/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#f59e0b", // Amber 500
        secondary: "#0f172a", // Slate 900
        accent: "#fffbeb", // Amber 50
        "accent-foreground": "#b45309", // Amber 700
        muted: "#f1f5f9", // Slate 100
        "muted-foreground": "#64748b", // Slate 500
        background: "#f8fafc", // Slate 50
        card: "#ffffff",
        destructive: "#ef4444",
        success: "#dcfce7",
        "success-foreground": "#166534",
        warning: "#fef9c3",
        "warning-foreground": "#854d0e",
        error: "#fee2e2",
        "error-foreground": "#991b1b",
        neutral: "#f3f4f6",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
