/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                heading: ['Plus Jakarta Sans', 'sans-serif'],
                serif: ['Playfair Display', 'Merriweather', 'serif'],
            },
            colors: {
                primary: {
                    DEFAULT: '#39F265',
                    foreground: '#111111',
                },
                secondary: {
                    DEFAULT: '#FEFDFA',
                    foreground: '#111111',
                },
                accent: {
                    DEFAULT: '#39F265',
                    foreground: '#111111',
                },
                background: {
                    main: '#111111',
                    card: '#1A1A1A',
                    dark_section: '#0A0A0A',
                },
                text: {
                    primary: '#FEFDFA',
                    secondary: '#A1A1A1',
                },
                lumo: {
                    50: '#E8FDF0',
                    100: '#D1FBE1',
                    200: '#A3F7C3',
                    300: '#75F3A5',
                    400: '#47EF87',
                    500: '#39F265', // Primary Green
                    600: '#2ECF53',
                    701: '#24AB42',
                    800: '#1A8732',
                    900: '#106321',
                    950: '#083111',
                }
            },
            boxShadow: {
                'card-default': '0 8px 30px rgba(0,0,0,0.4)',
                'card-hover': '0 20px 50px rgba(57, 242, 101, 0.15)',
                'button-glow': '0 0 25px rgba(57, 242, 101, 0.4)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            },
            backgroundImage: {
                'gradient-cta': 'linear-gradient(135deg, #39F265 0%, #2ecc71 100%)',
                'gradient-dark': 'linear-gradient(180deg, #111111 0%, #0A0A0A 100%)',
                'gradient-glow': 'radial-gradient(circle at 50% 50%, rgba(57, 242, 101, 0.15) 0%, rgba(17, 17, 17, 0) 70%)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'float': 'float 6s ease-in-out infinite',
                'float-delayed': 'float 6s ease-in-out infinite 3s',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                }
            },
        },
    },
    plugins: [],
}
