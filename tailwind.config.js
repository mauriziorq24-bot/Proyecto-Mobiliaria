/** @type {import('tailwindcss').Config} */
export default {
    content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
    extend: {
        colors: {
        app: {
            primary: 'var(--c-primary)',
            secondary: 'var(--c-secondary)',
            warning: 'var(--c-warning)',
            main: 'var(--c-bg-main)',
            card: 'var(--c-bg-card)',
            sidebar: 'var(--c-bg-sidebar)',
            text: 'var(--c-text-main)',
            border: 'rgba(255, 255, 255, 0.1)',
            muted: '#9CA3AF',
        }
        }
    },
    },
    plugins: [],
}