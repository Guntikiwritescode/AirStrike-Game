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
        // Core tactical ops palette (Lattice vibe)
        bg: "#0B0F14",
        panel: "#0E131A", 
        panel2: "#121924",
        ink: "#E6EDF3",
        accent2: "#20C6F7",
        warn: "#FF6B6B",
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
        // Responsive typography scale with clamp
        xs: ["clamp(11px, 2.5vw, 12px)", { lineHeight: "1.4" }],
        sm: ["clamp(12px, 2.8vw, 13px)", { lineHeight: "1.4" }],
        base: ["clamp(13px, 3vw, 14px)", { lineHeight: "1.4" }],
        lg: ["clamp(15px, 3.5vw, 16px)", { lineHeight: "1.5" }],
        xl: ["clamp(18px, 4vw, 20px)", { lineHeight: "1.4" }],
        "2xl": ["clamp(24px, 5vw, 28px)", { lineHeight: "1.3" }],
        // Tactical monospace for telemetry/data
        telemetry: ["clamp(11px, 2.5vw, 12px)", { lineHeight: "1.2", fontFamily: "var(--font-jetbrains)" }],
        stat: ["clamp(12px, 2.8vw, 13px)", { lineHeight: "1.2", fontFamily: "var(--font-jetbrains)" }],
        callsign: ["clamp(11px, 2.5vw, 12px)", { lineHeight: "1.2", fontFamily: "var(--font-jetbrains)" }],
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
        DEFAULT: "0.5rem",     // 8px - default tactical radius
        lg: "0.75rem",         // 12px
        xl: "1rem",            // 16px  
        "2xl": "1rem",         // 16px - tactical panels
        "3xl": "1.5rem",       // 24px - large panels
      },
      
      spacing: {
        // 8px grid system
        px: "1px",
        0: "0",
        1: "0.125rem",    // 2px
        2: "0.25rem",     // 4px  
        3: "0.5rem",      // 8px  - base unit
        4: "0.75rem",     // 12px
        5: "1rem",        // 16px
        6: "1.5rem",      // 24px
        7: "2rem",        // 32px
        8: "2.5rem",      // 40px
        9: "3rem",        // 48px
        10: "4rem",       // 64px
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
        // Tactical UI components
        '.tactical-card': {
          '@apply bg-panel rounded-2xl p-5 border border-grid/40 shadow-none': {},
        },
        '.tactical-panel': {
          '@apply bg-panel2 rounded-2xl p-4 border border-grid/40': {},
        },
        '.tactical-stat': {
          '@apply font-mono text-stat text-ink tabular-nums tracking-wide': {},
        },
        '.tactical-btn': {
          '@apply rounded-xl bg-panel2 hover:bg-panel border border-grid/40 transition-colors duration-150 px-4 py-2': {},
        },
        '.tactical-btn-primary': {
          '@apply rounded-xl bg-accent text-bg hover:bg-accent2 border-0 transition-colors duration-150 px-4 py-2 font-medium': {},
        },
        '.tactical-input': {
          '@apply bg-input border border-grid/40 rounded-xl px-3 py-2 text-ink placeholder-muted focus:border-accent focus:ring-1 focus:ring-accent': {},
        },
        '.tactical-header': {
          '@apply text-ink font-medium text-lg mb-4': {},
        },
        '.tactical-subheader': {
          '@apply text-muted font-medium text-sm mb-3 uppercase tracking-wider': {},
        },
        '.tactical-divider': {
          '@apply border-t border-grid/40 my-4': {},
        },
        '.tactical-glyph': {
          '@apply text-accent drop-shadow-sm': {},
        },
        '.tactical-focus': {
          '@apply focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-bg rounded': {},
        },
      });
    }
  ],
} satisfies Config;