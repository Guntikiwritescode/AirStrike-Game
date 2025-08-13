import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Core tactical ops palette
        bg: "#0B0F14",
        panel: "#0E131A", 
        panel2: "#121924",
        ink: "#E6EDF3",
        accent2: "#20C6F7",
        warn: "#FF6B6B",
        warn2: "#FF8A8A",
        ok: "#84F7A8",
        grid: "#1B2430",
        
        // shadcn/ui compatibility
        background: "#0B0F14",
        foreground: "#E6EDF3",
        card: "#0E131A",
        "card-foreground": "#E6EDF3",
        popover: "#0E131A",
        "popover-foreground": "#E6EDF3",
        primary: "#55E3FF",
        "primary-foreground": "#0B0F14",
        secondary: "#121924",
        "secondary-foreground": "#E6EDF3",
        muted: "#121924",
        "muted-foreground": "#9FB2C6",
        accent: "#55E3FF",
        "accent-foreground": "#0B0F14",
        destructive: "#FF6B6B",
        "destructive-foreground": "#E6EDF3",
        border: "#1B2430",
        input: "#121924",
        ring: "#55E3FF",
      },
      
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "Monaco", "monospace"],
      },
      
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "18px" }],
        base: ["14px", { lineHeight: "20px" }],
        lg: ["16px", { lineHeight: "24px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["28px", { lineHeight: "36px" }],
      },
      
      boxShadow: {
        glow: "0 0 0 2px rgba(85,227,255,.18)",
        "glow-focus": "0 0 0 2px rgba(85,227,255,.35)",
        "glow-intense": "0 0 0 3px rgba(85,227,255,.25), 0 0 12px rgba(85,227,255,.15)",
      },
      
      transitionDuration: {
        fast: "120ms",
        medium: "180ms",
      },
      
      borderRadius: {
        xl2: "1rem",
      },
      
      animation: {
        "dash-offset": "dash-offset 3s linear infinite",
        "subtle-pulse": "subtle-pulse 2s ease-in-out infinite",
        "fade-in": "fade-in 0.15s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
      },
      
      keyframes: {
        "dash-offset": {
          "0%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "24" },
        },
        "subtle-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [
    // Custom plugin for tactical ops utilities
    function({ addUtilities }: any) {
      addUtilities({
        '.card': {
          '@apply bg-panel rounded-2xl p-4 border border-grid/40': {},
        },
        '.stat': {
          '@apply font-mono text-sm text-ink/90 tabular-nums': {},
        },
        '.btn': {
          '@apply rounded-xl bg-panel2 hover:bg-panel border border-grid/50 transition-colors duration-fast': {},
        },
        '.glyph': {
          '@apply text-accent drop-shadow-sm': {},
        },
        '.panel-header': {
          '@apply text-ink font-medium text-base mb-3': {},
        },
        '.divider': {
          '@apply border-t border-grid/40 my-3': {},
        },
        '.focus-ring': {
          '@apply focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg': {},
        },
      });
    }
  ],
} satisfies Config;