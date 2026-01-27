/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // 아로마테라피 기반 컬러 팔레트
        lavender: {
          50: '#F8F8FF',
          100: '#E6E6FA',
          200: '#DDA0DD',
          300: '#D8BFD8',
          400: '#DA70D6',
          500: '#BA55D3',
          600: '#9932CC',
          700: '#8B008B',
          800: '#800080',
          900: '#4B0082',
        },
        mint: {
          50: '#F0FFF0',
          100: '#E0F2E7',
          200: '#B8E6C1',
          300: '#90EE90',
          400: '#98FB98',
          500: '#00FA9A',
          600: '#00FF7F',
          700: '#32CD32',
          800: '#228B22',
          900: '#006400',
        },
        chamomile: {
          50: '#FFFAF0',
          100: '#FFF8DC',
          200: '#F0E68C',
          300: '#F5DEB3',
          400: '#DEB887',
          500: '#D2B48C',
          600: '#BC9A6A',
          700: '#8B7D6B',
          800: '#8B7355',
          900: '#654321',
        },
        eucalyptus: {
          50: '#F0F8FF',
          100: '#E0F6FF',
          200: '#B0E0E6',
          300: '#87CEEB',
          400: '#87CEFA',
          500: '#4682B4',
          600: '#4169E1',
          700: '#0000CD',
          800: '#00008B',
          900: '#191970',
        },
        soft: {
          white: '#FAFAFA',
          gray: {
            100: '#F8F8F8',
            200: '#F0F0F0',
            300: '#E8E8E8',
            400: '#D0D0D0',
            500: '#A0A0A0',
            600: '#6B6B6B',
            700: '#4A4A4A',
            800: '#2A2A2A',
            900: '#1A1A1A',
          }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'mist': 'mist 4s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        mist: {
          '0%, 100%': { opacity: '0.1', transform: 'scale(0.8)' },
          '50%': { opacity: '0.3', transform: 'scale(1.2)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(230, 230, 250, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(230, 230, 250, 0.6)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}