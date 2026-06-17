import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutros como variables CSS → soportan modo claro/oscuro (ver globals.css)
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        "bg-soft": "rgb(var(--c-bg-soft) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--c-surface-2) / <alpha-value>)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        text: "rgb(var(--c-text) / <alpha-value>)",
        "text-muted": "rgb(var(--c-text-muted) / <alpha-value>)",
        "text-dim": "rgb(var(--c-text-dim) / <alpha-value>)",
        // Marca Daptux.IA (verde lima del logo)
        brand: "rgb(var(--c-brand) / <alpha-value>)",
        // Núcleo del Director + firmas de agentes
        director: "#E8C766",
        prospect: "#22D3EE",
        research: "#A78BFA",
        scoring: "#FBBF24",
        email: "#34D399",
        voice: "#FB7185",
        // semánticos
        ok: "#34D399",
        warn: "#FBBF24",
        danger: "#FB7185",
        hot: "#FB7185",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.18), 0 0 40px -8px rgba(34,211,238,0.35)",
        "glow-soft": "0 0 30px -10px rgba(167,139,250,0.4)",
        panel: "0 24px 60px -24px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.05) 1px, transparent 1px)",
        "radial-deck":
          "radial-gradient(120% 100% at 50% 0%, rgba(34,211,238,0.10), transparent 55%), radial-gradient(80% 80% at 80% 100%, rgba(167,139,250,0.08), transparent 60%)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
        float: "float 5s ease-in-out infinite",
        scan: "scan 3.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
