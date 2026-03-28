/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bio: {
          black: "#0a0a0a",
          dark: "#111118",
          card: "#16161f",
          border: "#2a2a3a",
          cyan: "#00e5ff",
          purple: "#7c3aed",
          green: "#00ff88",
          red: "#ff3366",
        },
      },
      fontFamily: {
        display: ["'Space Mono'", "monospace"],
        body: ["'DM Sans'", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "scan": "scan 2s linear infinite",
        "glow": "glow 2s ease-in-out infinite",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0,229,255,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(0,229,255,0.7)" },
        },
      },
    },
  },
  plugins: [],
};
