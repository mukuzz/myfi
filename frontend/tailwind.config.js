/** @type {import('tailwindcss').Config} */
module.exports = {
  content:  [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f9f9f9', // Very light bluish gray background (Slate-50)
        foreground: '#1f2937', // Dark gray text
        primary: {
          DEFAULT: '#4b5563', // Gray-600
          foreground: '#feffff', // White text on primary
        },
        secondary: {
          DEFAULT: '#feffff', // White
          foreground: '#1f2937', // Dark gray text on secondary
        },
        muted: {
          DEFAULT: '#f3f4f6', // Gray-100
          foreground: '#6b7280', // Gray-500
        },
        accent: {
          DEFAULT: '#22c55e', // Emerald-500
          foreground: '#feffff', // White text on accent
        },
        border: '#e5e7eb', // Gray-250
        input: '#e5e7eb', // Gray-200 (for input borders)
        ring: '#4b5563', // Gray-600 (for focus rings)
        error: {
          DEFAULT: '#ef4444', // Red-500
          foreground: '#feffff', // White text on error bg
        },
        success: {
           DEFAULT: '#22c55e', // Green-500
           foreground: '#feffff', // White text on success bg
        }
      },
    },
  },
  plugins: [],
}

