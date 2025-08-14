'use client';

import React, { useMemo, useCallback } from 'react';
import { scaleLinear } from 'd3-scale';

interface HeatmapLegendProps {
  min: number;
  max: number;
  colorScheme: 'value' | 'risk' | 'posterior' | 'variance';
  title: string;
  unit?: string;
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  width?: number;
  height?: number;
  className?: string;
}

// Professional color schemes
const COLOR_SCHEMES = {
  value: {
    // Cyan to purple for value/EV
    colors: ['#0891b2', '#0284c7', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'],
    name: 'Expected Value'
  },
  risk: {
    // Orange family for risk
    colors: ['#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#dc2626'],
    name: 'Risk Level'
  },
  posterior: {
    // Blue to cyan for posterior probability
    colors: ['#1e3a8a', '#1e40af', '#2563eb', '#3b82f6', '#06b6d4', '#0891b2'],
    name: 'Posterior P(Hostile)'
  },
  variance: {
    // Purple to pink for uncertainty/variance
    colors: ['#581c87', '#7c3aed', '#8b5cf6', '#a855f7', '#c084fc', '#e879f9'],
    name: 'Uncertainty'
  }
};

export default function HeatmapLegend({
  min,
  max,
  colorScheme,
  title,
  unit = '',
  position = 'top-right',
  width = 200,
  height = 20,
  className = ''
}: HeatmapLegendProps) {
  const scheme = COLOR_SCHEMES[colorScheme];
  
  // Create color interpolator
  const colorInterpolator = useMemo(() => {
    const colors = scheme.colors;
    const scale = scaleLinear<string>()
      .domain(colors.map((_, i) => i / (colors.length - 1)))
      .range(colors);
    
    return (t: number) => scale(Math.max(0, Math.min(1, t)));
  }, [scheme.colors]);

  // Generate gradient stops
  const gradientStops = useMemo(() => {
    const stops = [];
    for (let i = 0; i <= 100; i += 5) {
      const t = i / 100;
      const color = colorInterpolator(t);
      stops.push({ offset: i, color });
    }
    return stops;
  }, [colorInterpolator]);

  // Generate tick marks and labels
  const ticks = useMemo(() => {
    const range = max - min;
    const tickCount = width > 150 ? 5 : 3;
    const ticks = [];
    
    for (let i = 0; i <= tickCount; i++) {
      const value = min + (range * i) / tickCount;
      const position = (i / tickCount) * 100;
      
      // Format value based on range and type
      let formattedValue: string;
      if (colorScheme === 'posterior' || colorScheme === 'variance') {
        formattedValue = (value * 100).toFixed(0) + '%';
      } else if (range < 1) {
        formattedValue = value.toFixed(3);
      } else if (range < 10) {
        formattedValue = value.toFixed(2);
      } else {
        formattedValue = value.toFixed(1);
      }
      
      if (unit) {
        formattedValue += unit;
      }
      
      ticks.push({ value: formattedValue, position });
    }
    
    return ticks;
  }, [min, max, width, colorScheme, unit]);

  // Position styles
  const positionStyles = useMemo(() => {
    const baseStyles = 'absolute z-50 pointer-events-none';
    switch (position) {
      case 'top-right':
        return `${baseStyles} top-4 right-4`;
      case 'bottom-right':
        return `${baseStyles} bottom-4 right-4`;
      case 'bottom-left':
        return `${baseStyles} bottom-4 left-4`;
      case 'top-left':
        return `${baseStyles} top-4 left-4`;
      default:
        return `${baseStyles} top-4 right-4`;
    }
  }, [position]);

  // Gradient ID for SVG
  const gradientId = `heatmap-gradient-${colorScheme}`;

  return (
    <div 
      className={`${positionStyles} ${className}`}
      style={{ width: width + 32 }}
    >
      {/* Legend Container */}
      <div className="bg-panel/95 border border-grid/40 rounded-lg p-3 backdrop-blur-sm shadow-lg">
        {/* Title */}
        <div className="text-xs font-semibold text-ink mb-2 text-center">
          {title}
        </div>
        
        {/* Color Bar */}
        <div className="relative mb-2">
          <svg width={width} height={height} className="rounded">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                {gradientStops.map((stop, i) => (
                  <stop
                    key={i}
                    offset={`${stop.offset}%`}
                    stopColor={stop.color}
                    stopOpacity={0.9}
                  />
                ))}
              </linearGradient>
            </defs>
            <rect
              width={width}
              height={height}
              fill={`url(#${gradientId})`}
              stroke="var(--grid)"
              strokeWidth={0.5}
              rx={2}
            />
          </svg>
          
          {/* Tick marks */}
          <div className="absolute top-0 left-0 w-full h-full">
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="absolute top-0 h-full"
                style={{ left: `${tick.position}%` }}
              >
                {/* Tick line */}
                <div 
                  className="w-px h-full bg-ink/40"
                  style={{ marginLeft: '-0.5px' }}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Labels */}
        <div className="relative" style={{ height: '24px' }}>
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="absolute text-xs font-mono text-muted whitespace-nowrap"
              style={{ 
                left: `${tick.position}%`,
                transform: i === 0 ? 'translateX(0%)' : 
                          i === ticks.length - 1 ? 'translateX(-100%)' : 
                          'translateX(-50%)',
                top: '2px'
              }}
            >
              {tick.value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for getting color from value
export function useHeatmapColor(colorScheme: keyof typeof COLOR_SCHEMES) {
  return useCallback((normalizedValue: number) => {
    const scheme = COLOR_SCHEMES[colorScheme];
    const scale = scaleLinear<string>()
      .domain(scheme.colors.map((_, i) => i / (scheme.colors.length - 1)))
      .range(scheme.colors);
    
    return scale(Math.max(0, Math.min(1, normalizedValue)));
  }, [colorScheme]);
}

// Export color schemes for use in other components
export { COLOR_SCHEMES };