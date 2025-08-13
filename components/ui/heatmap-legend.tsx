'use client';

import { cn } from '@/lib/utils';

interface HeatmapLegendProps {
  title: string;
  min: number;
  max: number;
  colorStops?: Array<{ value: number; color: string }>;
  unit?: string;
  className?: string;
}

export function HeatmapLegend({
  title,
  min,
  max,
  colorStops = [
    { value: 0, color: 'rgba(85, 227, 255, 0)' },
    { value: 0.5, color: 'rgba(85, 227, 255, 0.5)' },
    { value: 1, color: 'rgba(85, 227, 255, 1)' }
  ],
  unit = '',
  className
}: HeatmapLegendProps) {
  const range = max - min;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    position: t * 100,
    value: min + (t * range),
    label: (min + (t * range)).toFixed(range < 1 ? 2 : 0)
  }));

  const gradientStops = colorStops
    .map(stop => `${stop.color} ${((stop.value - min) / range) * 100}%`)
    .join(', ');

  return (
    <div className={cn('space-y-2', className)}>
      {/* Title */}
      <div className="text-xs font-medium text-muted uppercase tracking-wider">
        {title}
      </div>

      {/* Legend bar */}
      <div className="relative">
        {/* Gradient bar */}
        <div 
          className="h-3 rounded border border-grid/40"
          style={{
            background: `linear-gradient(to right, ${gradientStops})`
          }}
        />

        {/* Tick marks */}
        <div className="absolute -bottom-1 left-0 right-0 h-2">
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="absolute w-px h-2 bg-grid"
              style={{ left: `${tick.position}%` }}
            />
          ))}
        </div>

        {/* Labels */}
        <div className="absolute -bottom-6 left-0 right-0">
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="absolute text-xs font-mono text-muted tabular-nums"
              style={{ 
                left: `${tick.position}%`,
                transform: 'translateX(-50%)'
              }}
            >
              {tick.label}{unit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}