/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light mode palette
        'bg-white': '#FFFFFF',
        'bg-light': '#F9FAFB',
        'text-black': '#000000',
        'text-dark': '#374151',
        'border-black': '#000000',
        'accent-gray': '#E5E7EB',
      },
      fontFamily: {
        'mono': ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

