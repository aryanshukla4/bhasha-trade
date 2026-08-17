/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#15803d',
          hover: '#166534',
          soft: '#f0fdf4',
          border: '#bbf7d0',
          text: '#166534',
        },
        ink: '#111827',
        muted: '#6b7280',
        line: '#e5e7eb',
        surface: '#f9fafb',
        danger: { DEFAULT: '#b91c1c', soft: '#fef2f2', border: '#fecaca' },
        warn: { DEFAULT: '#b45309', soft: '#fffbeb', border: '#fde68a' },
        info: { DEFAULT: '#1d4ed8', soft: '#eff6ff', border: '#bfdbfe' },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans',
          'Noto Sans Devanagari',
          'Noto Sans Tamil',
          'Noto Sans Telugu',
          'Nirmala UI',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        page: '1120px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        lift: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
        modal: '0 20px 40px -12px rgb(0 0 0 / 0.22)',
      },
    },
  },
  plugins: [],
}
