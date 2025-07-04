import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#0a0a0f',
        'nebula-purple': '#5e17eb',
        'star-white': '#f0f0f5',
        'orbit-gray': '#3a3a4a',
        'risk-high': '#ff3b30',
        'risk-medium': '#ff9500',
        'risk-low': '#34c759',
        'risk-safe': '#007aff',
      },
      animation: {
        'orbit': 'orbit 20s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'impact-wave': 'impact-wave 2s ease-out infinite',
      },
      keyframes: {
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'impact-wave': {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
export default config