/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                bg: {
                    primary: 'var(--color-bg-primary)',
                    secondary: 'var(--color-bg-secondary)',
                },
                accent: {
                    primary: 'var(--color-accent-primary)',
                    secondary: 'var(--color-accent-secondary)',
                    gold: 'var(--color-accent-gold)',
                }
            }
        },
    },
    plugins: [],
}
