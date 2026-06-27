/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        uae: {
          red: "var(--uae-red)",
          green: "var(--success)",
          black: "var(--heading)",
          sand: "var(--brand-soft)",
          mist: "var(--neutral-primary-soft)",
          line: "var(--border-default)",
          panel: "var(--neutral-secondary-soft)",
          muted: "var(--body)",
          wash: "var(--neutral-tertiary)",
        },
      },
      boxShadow: {
        soft: "var(--shadow-sm) var(--border-dark)",
      },
    },
  },
  plugins: [],
};
