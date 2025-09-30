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
        background: "#000000",
        foreground: "#FFFFFF",
        "cyber-green": "#00FF00",
        "electric-cyan": "#00FFFF",
        "warning-amber": "#FFAA00",
        "steel-gray": "#404040",
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 1s ease-in-out",
        "slide-up": "slideUp 0.8s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 255, 0, 0.5)" },
          "50%": { boxShadow: "0 0 40px rgba(0, 255, 0, 0.8)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
