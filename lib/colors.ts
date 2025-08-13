/**
 * Accessible Color System for Bayesian Forward Operator
 * 
 * This module provides colorblind-safe palettes and color utility functions
 * designed for accessibility and clarity in data visualization.
 */

// Base colorblind-safe palette (Viridis-inspired with contrast enhancements)
export const COLORBLIND_SAFE_PALETTE = {
  // Primary probability colors (blue to yellow to red)
  probability: {
    veryLow: '#440154',    // Deep purple
    low: '#31688e',       // Blue
    medium: '#35b779',    // Green  
    high: '#fde725',      // Yellow
    veryHigh: '#dc143c'   // Red
  },
  
  // Sensor type colors (distinct hues with good contrast)
  sensors: {
    drone: '#3b82f6',     // Blue
    sigint: '#f59e0b',    // Amber/Orange
    spotter: '#10b981'    // Emerald/Green
  },
  
  // Status colors (universally accessible)
  status: {
    success: '#059669',   // Green
    warning: '#d97706',   // Orange
    error: '#dc2626',     // Red
    info: '#2563eb',      // Blue
    neutral: '#6b7280'    // Gray
  },
  
  // Infrastructure and hostile indicators
  entities: {
    hostile: '#ef4444',   // Red with good contrast
    infrastructure: '#8b5cf6', // Purple
    neutral: '#64748b',   // Slate
    unknown: '#374151'    // Dark gray
  },
  
  // Heatmap scales (designed for accessibility)
  heatmaps: {
    // Expected Value: Blue (negative) to Green (positive)
    expectedValue: {
      negative: '#1e40af',  // Blue
      zero: '#374151',      // Neutral gray
      positive: '#059669'   // Green
    },
    
    // Risk: Green (safe) to Red (dangerous)  
    risk: {
      safe: '#059669',      // Green
      moderate: '#d97706',  // Orange
      dangerous: '#dc2626'  // Red
    },
    
    // Uncertainty: Dark (certain) to Bright (uncertain)
    uncertainty: {
      certain: '#1f2937',   // Very dark
      uncertain: '#fbbf24' // Bright yellow
    }
  }
} as const;

// Color scale generators
export function generateProbabilityColor(probability: number): string {
  // Clamp probability to [0, 1]
  const p = Math.max(0, Math.min(1, probability));
  
  if (p < 0.2) return COLORBLIND_SAFE_PALETTE.probability.veryLow;
  if (p < 0.4) return COLORBLIND_SAFE_PALETTE.probability.low;
  if (p < 0.6) return COLORBLIND_SAFE_PALETTE.probability.medium;
  if (p < 0.8) return COLORBLIND_SAFE_PALETTE.probability.high;
  return COLORBLIND_SAFE_PALETTE.probability.veryHigh;
}

export function generateExpectedValueColor(ev: number, maxAbsEV: number = 100): string {
  if (maxAbsEV === 0) return COLORBLIND_SAFE_PALETTE.heatmaps.expectedValue.zero;
  
  const normalizedEV = ev / maxAbsEV; // Normalize to [-1, 1]
  
  if (normalizedEV > 0.1) return COLORBLIND_SAFE_PALETTE.heatmaps.expectedValue.positive;
  if (normalizedEV < -0.1) return COLORBLIND_SAFE_PALETTE.heatmaps.expectedValue.negative;
  return COLORBLIND_SAFE_PALETTE.heatmaps.expectedValue.zero;
}

export function generateRiskColor(riskLevel: number): string {
  // Risk level from 0 (safe) to 1 (dangerous)
  const r = Math.max(0, Math.min(1, riskLevel));
  
  if (r < 0.33) return COLORBLIND_SAFE_PALETTE.heatmaps.risk.safe;
  if (r < 0.67) return COLORBLIND_SAFE_PALETTE.heatmaps.risk.moderate;
  return COLORBLIND_SAFE_PALETTE.heatmaps.risk.dangerous;
}

export function generateUncertaintyColor(entropy: number, maxEntropy: number = 1): string {
  if (maxEntropy === 0) return COLORBLIND_SAFE_PALETTE.heatmaps.uncertainty.certain;
  
  const normalizedEntropy = Math.max(0, Math.min(1, entropy / maxEntropy));
  
  // Interpolate between certain and uncertain colors
  const certain = hexToRgb(COLORBLIND_SAFE_PALETTE.heatmaps.uncertainty.certain);
  const uncertain = hexToRgb(COLORBLIND_SAFE_PALETTE.heatmaps.uncertainty.uncertain);
  
  if (!certain || !uncertain) return COLORBLIND_SAFE_PALETTE.heatmaps.uncertainty.certain;
  
  const r = Math.round(certain.r + (uncertain.r - certain.r) * normalizedEntropy);
  const g = Math.round(certain.g + (uncertain.g - certain.g) * normalizedEntropy);
  const b = Math.round(certain.b + (uncertain.b - certain.b) * normalizedEntropy);
  
  return `rgb(${r}, ${g}, ${b})`;
}

// Color utility functions
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const sRGB = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

// Pattern-based accessibility (for extreme colorblind users)
export const PATTERN_STYLES = {
  stripes: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
  dots: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
  grid: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
  solid: 'none'
} as const;

export type PatternType = keyof typeof PATTERN_STYLES;

// CSS class generators for Tailwind
export function getProbabilityClasses(probability: number): {
  bg: string;
  text: string;
  border: string;
} {
  const p = Math.max(0, Math.min(1, probability));
  
  if (p < 0.2) return {
    bg: 'bg-purple-900',
    text: 'text-purple-100',
    border: 'border-purple-700'
  };
  if (p < 0.4) return {
    bg: 'bg-blue-700',
    text: 'text-blue-100', 
    border: 'border-blue-500'
  };
  if (p < 0.6) return {
    bg: 'bg-green-600',
    text: 'text-green-100',
    border: 'border-green-400'
  };
  if (p < 0.8) return {
    bg: 'bg-yellow-500',
    text: 'text-yellow-900',
    border: 'border-yellow-400'
  };
  return {
    bg: 'bg-red-600',
    text: 'text-red-100',
    border: 'border-red-400'
  };
}

export function getSensorClasses(sensorType: string): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (sensorType.toLowerCase()) {
    case 'drone':
      return {
        bg: 'bg-blue-600',
        text: 'text-blue-100',
        border: 'border-blue-400',
        icon: 'text-blue-300'
      };
    case 'sigint':
      return {
        bg: 'bg-amber-600',
        text: 'text-amber-100',
        border: 'border-amber-400',
        icon: 'text-amber-300'
      };
    case 'spotter':
      return {
        bg: 'bg-emerald-600',
        text: 'text-emerald-100',
        border: 'border-emerald-400',
        icon: 'text-emerald-300'
      };
    default:
      return {
        bg: 'bg-slate-600',
        text: 'text-slate-100',
        border: 'border-slate-400',
        icon: 'text-slate-300'
      };
  }
}

// Accessibility testing utilities
export function testColorAccessibility(backgroundColor: string, textColor: string): {
  contrastRatio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  recommendation: string;
} {
  const ratio = getContrastRatio(backgroundColor, textColor);
  
  return {
    contrastRatio: ratio,
    wcagAA: ratio >= 4.5,
    wcagAAA: ratio >= 7,
    recommendation: ratio >= 7 ? 'Excellent' : 
                   ratio >= 4.5 ? 'Good (WCAG AA)' :
                   ratio >= 3 ? 'Poor - consider improving' :
                   'Failing - needs improvement'
  };
}

// Color scheme for different UI contexts
export const UI_COLOR_SCHEMES = {
  game: {
    background: 'bg-slate-900',
    surface: 'bg-slate-800',
    border: 'border-slate-600',
    text: {
      primary: 'text-slate-100',
      secondary: 'text-slate-300',
      muted: 'text-slate-400'
    }
  },
  
  modal: {
    background: 'bg-slate-800',
    surface: 'bg-slate-700',
    border: 'border-slate-600',
    text: {
      primary: 'text-slate-100',
      secondary: 'text-slate-200',
      muted: 'text-slate-400'
    }
  },
  
  tooltip: {
    background: 'bg-slate-900',
    surface: 'bg-slate-800',
    border: 'border-slate-700',
    text: {
      primary: 'text-slate-100',
      secondary: 'text-slate-200',
      muted: 'text-slate-400'
    }
  }
} as const;