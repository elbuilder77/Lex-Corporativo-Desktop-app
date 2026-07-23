/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        legal: {
          950: '#0f172a',
          900: '#1e293b',
          800: '#334155',
          700: '#475569',
          600: '#64748b',
          100: '#f1f5f9',
          50: '#f8fafc',
          gold: '#d4af37',
          goldhover: '#c5a059',
          golddark: '#a08520',
          accent: '#3b82f6'
        },
        mercantil: {
          DEFAULT: '#0F2742',
          light: '#132F4C',
          dark: '#091626',
          accent: '#1D4ED8',
          bg: '#f0f4f8',
          50: '#eff6ff',
          100: '#dbeafe',
        },
        fiscal: {
          DEFAULT: '#166534',
          light: '#047857',
          dark: '#0f2b23',
          accent: '#10B981',
          bg: '#f0fdf4',
          50: '#f0fdf4',
          100: '#dcfce7',
        }
      },
      boxShadow: {
        premium: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
        'inner-soft': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      },
      animation: {
        'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.2s ease-out forwards',
        'fade-in': 'fadeIn 0.15s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
