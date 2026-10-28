/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: "#4C0519",
          deep: "#3A0312",
          bright: "#9F1239",
          line: "#7A0E24",
        },
        blush: "#FFF5F7",
        alabaster: "#FAF7F8",
        coral: "#F43F5E",
        ink: "#1A0A0F",
        soft: "rgba(76, 5, 25, 0.05)",
        rail: "rgba(76, 5, 25, 0.10)",
      },
      fontFamily: {
        display: ["Outfit", "system-ui", "-apple-system", "sans-serif"],
        body: ["Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.035em",
        tight: "-0.025em",
      },
      boxShadow: {
        pill: "0 10px 30px rgba(76, 5, 25, 0.08)",
        card: "0 1px 2px rgba(26, 10, 15, 0.04), 0 14px 36px -18px rgba(76, 5, 25, 0.18)",
        "card-lift": "0 2px 10px rgba(26, 10, 15, 0.05), 0 22px 48px -22px rgba(76, 5, 25, 0.22)",
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
        pill: "9999px",
        huge: "3.5rem",
      },
      keyframes: {
        "mask-slide-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "0.85" },
          "50%": { opacity: "1" },
        },
        "blush-sweep": {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-4px) scale(1.02)" },
        },
      },
      animation: {
        "mask-slide-up": "mask-slide-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "soft-pulse": "soft-pulse 2.6s ease-in-out infinite",
        "blush-sweep": "blush-sweep 4.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
