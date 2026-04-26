/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ["Orbitron", "monospace"],
        mono: ["JetBrains Mono", "Share Tech Mono", "monospace"],
      },
      colors: {
        // ── Cyberpunk Neon Palette ──────────────────────────────────────────
        "neon-cyan":    "#00ffff",
        "neon-magenta": "#ff2d78",
        "neon-green":   "#00ff9f",
        "neon-amber":   "#f59e0b",
        "neon-purple":  "#bf00ff",
        // ── Cyberpunk Dark Backgrounds ──────────────────────────────────────
        "cyber-black":  "#030308",
        "cyber-dark":   "#060610",
        "cyber-panel":  "#0a0a18",
        "cyber-card":   "#0d0d20",
        "cyber-border": "#1a1a2e",
        "cyber-mid":    "#0a0a15",
      },
      boxShadow: {
        "neon-cyan":    "0 0 20px #00ffff88, 0 0 40px #00ffff44",
        "neon-magenta": "0 0 20px #ff2d7888, 0 0 40px #ff2d7844",
        "neon-green":   "0 0 20px #00ff9f88, 0 0 40px #00ff9f44",
        "neon-amber":   "0 0 20px #f59e0b88, 0 0 40px #f59e0b44",
        "neon-sm-cyan":    "0 0 10px #00ffff66",
        "neon-sm-magenta": "0 0 10px #ff2d7866",
        "neon-sm-green":   "0 0 10px #00ff9f66",
      },
      backgroundImage: {
        "cyber-grid": "linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)",
        "cyber-radial": "radial-gradient(ellipse at 20% 50%, #0d0d2e 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #1a0d2e 0%, transparent 50%)",
        "neon-cyan-glow": "radial-gradient(ellipse, #00ffff22 0%, transparent 70%)",
        "rank-gradient": "linear-gradient(90deg, #00ffff, #00ff9f)",
      },
      backgroundSize: {
        "cyber-grid": "40px 40px",
      },
      animation: {
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "scanline":   "scanline 4s linear infinite",
        "flicker":    "flicker 0.15s infinite",
        "explode":    "explode 0.8s ease-out forwards",
        "slide-in":   "slideIn 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
        "slide-up":   "slideUp 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow":  "spin 8s linear infinite",
        "bounce-sm":  "bounceSm 1s ease-in-out infinite",
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { textShadow: "0 0 10px #00ffff, 0 0 20px #00ffff" },
          "50%":      { textShadow: "0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff44" },
        },
        scanline: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.95" },
        },
        explode: {
          "0%":   { transform: "translate(0, 0) scale(1)", opacity: "1" },
          "100%": { transform: "translate(var(--tx), var(--ty)) scale(0)", opacity: "0" },
        },
        slideIn: {
          from: { transform: "translateX(100%)", opacity: "0" },
          to:   { transform: "translateX(0)",    opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to:   { transform: "translateY(0)",    opacity: "1" },
        },
        bounceSm: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
      },
    },
  },
  plugins: [],
};
