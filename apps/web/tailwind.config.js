/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                space: {
                    50: '#f0f4ff',
                    100: '#e0e9ff',
                    200: '#c7d7fe',
                    300: '#a5b9fc',
                    400: '#8493f8',
                    500: '#6b70f0',
                    600: '#5449e4',
                    700: '#483bc9',
                    800: '#3d33a3',
                    900: '#362f81',
                    950: '#0f0a2e',
                },
                cyber: {
                    purple: '#9945FF',
                    blue: '#14F195',
                    pink: '#FF2E97',
                    cyan: '#00D4FF',
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'cyber-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'space-gradient': 'linear-gradient(135deg, #0f0a2e 0%, #1a0b3d 50%, #2d1b69 100%)',
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(99, 102, 241, 0.2)',
                'glass-hover': '0 8px 32px 0 rgba(99, 102, 241, 0.4)',
                'neon': '0 0 20px rgba(153, 69, 255, 0.6)',
                'neon-blue': '0 0 20px rgba(20, 241, 149, 0.6)',
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'slide-up': 'slideUp 0.5s ease-out',
                'fade-in': 'fadeIn 0.3s ease-out',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 20px rgba(153, 69, 255, 0.4)' },
                    '100%': { boxShadow: '0 0 30px rgba(153, 69, 255, 0.8)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
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
