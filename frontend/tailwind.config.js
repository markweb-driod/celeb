/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        mint:  { DEFAULT: '#d4a843', soft: '#ead99a' },   /* champagne gold */
        amber: { DEFAULT: '#d4881a', lt: '#f0b84a' },      /* rich warm amber */
        ink: {
          900: '#0c0c0e',
          800: '#141418',
          700: '#1e1e26',
          600: '#28282e',
        },
      },
      animation: {
        'fade-up':       'fadeUp 0.75s ease both',
        'fade-up-delay': 'fadeUp 0.75s 0.18s ease both',
        'slide-right':   'slideRight 0.7s 0.1s ease both',
        'float':         'floatY 7s ease-in-out infinite',
        'float-slow':    'floatY 11s ease-in-out infinite',
        'glow':          'glowPulse 4s ease-in-out infinite',
        'shimmer':       'shimmerMove 5s linear infinite',
        'bounce-sub':    'bounceSub 2s ease-in-out infinite',
        'spin-slow':     'spin 20s linear infinite',
        'border-pulse':  'borderPulse 3s ease-in-out infinite',
        'marquee':       'marqueeX 38s linear infinite',
      },
    },
  },
  plugins: [],
}
