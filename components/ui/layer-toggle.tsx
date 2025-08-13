'use client';

import { useState } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { HeatmapType } from '@/lib/types';

interface LayerToggleProps {
  activeLayer: HeatmapType;
  onLayerChange: (layer: HeatmapType) => void;
  disabled?: boolean;
  className?: string;
}

const layerConfig = {
  posterior: {
    label: 'POSTERIOR',
    description: 'Current belief probabilities',
    shortcut: 'P'
  },
  expectedValue: {
    label: 'EV',
    description: 'Expected value of actions',
    shortcut: 'E'
  },
  valueOfInformation: {
    label: 'VOI',
    description: 'Value of additional intel',
    shortcut: 'V'
  },
  riskAverse: {
    label: 'RISK',
    description: 'Risk-adjusted metrics',
    shortcut: 'R'
  },
  variance: {
    label: 'VAR',
    description: 'Uncertainty variance',
    shortcut: 'U'
  },
  lossRisk: {
    label: 'LOSS',
    description: 'Loss risk analysis',
    shortcut: 'L'
  },
  truth: {
    label: 'TRUTH',
    description: 'Ground truth (debug)',
    shortcut: 'T'
  },
  priorField: {
    label: 'PRIOR',
    description: 'Prior field distribution',
    shortcut: 'F'
  }
} as const;

export function LayerToggle({
  activeLayer,
  onLayerChange,
  disabled = false,
  className
}: LayerToggleProps) {
  const [hoveredLayer, setHoveredLayer] = useState<HeatmapType | null>(null);

  const layers = ['posterior', 'expectedValue', 'valueOfInformation', 'riskAverse'] as HeatmapType[];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {layers.map((layer) => {
        const config = layerConfig[layer];
        const isActive = activeLayer === layer;
        const isHovered = hoveredLayer === layer;

        return (
          <div key={layer} className="relative">
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => onLayerChange(layer)}
              disabled={disabled}
              onMouseEnter={() => setHoveredLayer(layer)}
              onMouseLeave={() => setHoveredLayer(null)}
              className={cn(
                'relative px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all duration-fast',
                isActive && 'bg-accent/10 text-accent border-accent/30',
                !isActive && 'text-muted hover:text-ink hover:bg-panel2/50'
              )}
            >
              {config.label}
              <span className="ml-1 text-xs opacity-60">
                {config.shortcut}
              </span>
            </Button>

            {/* Animated underline */}
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 h-0.5 bg-accent transition-all duration-fast',
                isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
              )}
            />

            {/* Tooltip on hover */}
            {isHovered && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-panel2 border border-grid/40 rounded text-xs text-muted whitespace-nowrap animate-fade-in z-50">
                {config.description}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-panel2 border-l border-t border-grid/40 rotate-45" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}