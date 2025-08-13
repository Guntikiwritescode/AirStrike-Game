// Theme tokens for Bayesian Forward Operator - Tactical Ops Aesthetic
export const theme = {
  colors: {
    // Core backgrounds
    bg: '#0B0F14',         // page background
    panel: '#0E131A',      // primary panels
    panel2: '#121924',     // secondary panels/cards
    
    // Typography
    ink: '#E6EDF3',        // primary text
    muted: '#9FB2C6',      // secondary text
    
    // Accent colors
    accent: '#55E3FF',     // cyan primary
    accent2: '#20C6F7',    // cyan secondary
    
    // Warning/danger
    warn: '#FF6B6B',       // red primary
    warn2: '#FF8A8A',      // red secondary
    
    // Success
    ok: '#84F7A8',         // teal-green
    
    // Grid/borders
    grid: '#1B2430',       // grid lines and borders
    
    // Colorblind-safe alternatives
    colorblind: {
      accent: '#36D6C5',   // turquoise
      warn: '#FF9F40'      // orange
    }
  },
  
  fonts: {
    sans: 'var(--font-inter)',
    mono: 'var(--font-jetbrains)'
  },
  
  fontSize: {
    xs: '12px',
    sm: '13px', 
    base: '14px',
    lg: '16px',
    xl: '20px',
    '2xl': '28px'
  },
  
  spacing: {
    1: '4px',
    2: '8px', 
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px'
  },
  
  borderRadius: {
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px'
  },
  
  boxShadow: {
    glow: '0 0 0 2px rgba(85,227,255,.18)',
    glowFocus: '0 0 0 2px rgba(85,227,255,.35)'
  },
  
  transition: {
    fast: '120ms',
    medium: '180ms',
    slow: '300ms'
  },
  
  zIndex: {
    tooltip: 1000,
    modal: 1100,
    toast: 1200
  }
} as const;

export type Theme = typeof theme;

// CSS custom properties generation
export const generateCSSVars = (useColorblind = false) => {
  const colors = useColorblind ? 
    { ...theme.colors, accent: theme.colors.colorblind.accent, warn: theme.colors.colorblind.warn } :
    theme.colors;
    
  return {
    '--color-bg': colors.bg,
    '--color-panel': colors.panel,
    '--color-panel-2': colors.panel2,
    '--color-ink': colors.ink,
    '--color-muted': colors.muted,
    '--color-accent': colors.accent,
    '--color-accent-2': colors.accent2,
    '--color-warn': colors.warn,
    '--color-warn-2': colors.warn2,
    '--color-ok': colors.ok,
    '--color-grid': colors.grid,
    '--font-sans': theme.fonts.sans,
    '--font-mono': theme.fonts.mono
  };
};