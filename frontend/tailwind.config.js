/** @type {import('tailwindcss').Config} */
module.exports = {
  content:  [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FBFCFC',
        foreground: '#20294B', 
        primary: {
          DEFAULT: '#4b5563', 
          foreground: '#ffffff', 
        },
        secondary: {
          DEFAULT: '#ffffff', 
          foreground: '#20294B', 
        },
        muted: {
          DEFAULT: '#EFF1F4', 
          foreground: '#676A89', 
        },
        border: '#dddfe9', 
        input: '#dddfe9', 
        ring: '#4b5563',
        error: {
          DEFAULT: '#ef4444', 
          foreground: '#ffffff', 
        },
        success: {
           DEFAULT: '#22c55e', 
           foreground: '#ffffff', 
        }
      },
    },
  },
  plugins: [],
}

