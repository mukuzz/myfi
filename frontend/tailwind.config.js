/** @type {import('tailwindcss').Config} */
module.exports = {
  content:  [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#ffffff', // White background
        foreground: '#1f2937', // Dark gray text
        primary: {
          DEFAULT: '#3b82f6', // Blue-500
          foreground: '#ffffff', // White text on primary
        },
        secondary: {
          DEFAULT: '#f3f4f6', // Gray-100
          foreground: '#1f2937', // Dark gray text on secondary
        },
        muted: {
          DEFAULT: '#f3f4f6', // Gray-100 (same as secondary for now)
          foreground: '#6b7280', // Gray-500
        },
        accent: {
          DEFAULT: '#10b981', // Emerald-500
          foreground: '#ffffff', // White text on accent
        },
        border: '#e5e7eb', // Gray-200
        input: '#e5e7eb', // Gray-200 (for input borders)
        ring: '#93c5fd', // Blue-300 (for focus rings)
        error: {
          DEFAULT: '#ef4444', // Red-500
          foreground: '#ffffff', // White text on error bg
        },
        success: {
           DEFAULT: '#22c55e', // Green-500
           foreground: '#ffffff', // White text on success bg
        }
      },
    },
  },
  plugins: [],
}

