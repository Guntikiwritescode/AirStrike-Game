'use client';

import React from 'react';
import { generateTooltipData } from '@/lib/tactical-overlays';

interface TacticalTooltipProps {
  object: unknown;
  position: { x: number; y: number };
  containerWidth: number;
}

export default function TacticalTooltip({ object, position, containerWidth }: TacticalTooltipProps) {
  if (!object || !position) return null;

  const tooltipText = generateTooltipData(object);
  if (!tooltipText) return null;

  // Position tooltip to avoid going off-screen
  const isRightSide = position.x > containerWidth / 2;
  
  return (
    <div 
      className="absolute pointer-events-none z-50 bg-panel/95 border border-accent/40 shadow-2xl rounded-lg backdrop-blur-sm transition-all duration-150 ease-out"
      style={{
        left: `${position.x + (isRightSide ? -15 : 15)}px`,
        top: `${position.y - 10}px`,
        transform: isRightSide ? 'translateX(-100%)' : 'none'
      }}
    >
      <div className="px-3 py-2 text-xs font-mono leading-tight whitespace-pre-line text-ink">
        {tooltipText}
      </div>
      
      {/* Tactical-style corner accent */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-accent/60 rounded-tl-lg"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-accent/60 rounded-br-lg"></div>
    </div>
  );
}