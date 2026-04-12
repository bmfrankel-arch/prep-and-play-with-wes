import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#1B2A4A",
        "navy-light": "#2C3E6B",
        sunshine: "#FFD166",
        "sunshine-dark": "#E6B84D",
        grass: "#06D6A0",
        "grass-dark": "#05B88A",
        coral: "#EF476F",
        "coral-dark": "#D63D5E",
        gold: "#FFD700",
        "gold-dark": "#DAA520",
      },
      fontFamily: {
        retro: ['"Press Start 2P"', "monospace"],
        nunito: ["Nunito", "sans-serif"],
      },
      animation: {
        "bounce-slow": "bounce 2s infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        flash: "flash 0.3s ease-in-out 3",
        "slide-up": "slideUp 0.5s ease-out",
        "scale-in": "scaleIn 0.5s ease-out",
        "fill-bar": "fillBar 1.5s ease-out forwards",
        starburst: "starburst 0.8s ease-out",
        confetti: "confettiDrop 1.5s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-out",
        "badge-evolve": "badgeEvolve 1s ease-in-out",
        wiggle: "wiggle 0.5s ease-in-out",
        "mic-pulse": "micPulse 1s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(255, 215, 0, 0.5)" },
          "50%": { boxShadow: "0 0 30px rgba(255, 215, 0, 0.9)" },
        },
        flash: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0", backgroundColor: "white" },
        },
        slideUp: {
          "0%": { transform: "translateY(50px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fillBar: {
          "0%": { width: "0%" },
          "100%": { width: "var(--fill-width, 100%)" },
        },
        starburst: {
          "0%": { transform: "scale(0) rotate(0deg)", opacity: "0" },
          "50%": { transform: "scale(1.3) rotate(180deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(360deg)", opacity: "1" },
        },
        confettiDrop: {
          "0%": { transform: "translateY(-100%) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        badgeEvolve: {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "25%": { transform: "scale(1.5) rotate(10deg)" },
          "50%": { transform: "scale(0.8) rotate(-10deg)" },
          "75%": { transform: "scale(1.3) rotate(5deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-5deg)" },
          "75%": { transform: "rotate(5deg)" },
        },
        micPulse: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.8" },
          "50%": { transform: "scale(1.15)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
