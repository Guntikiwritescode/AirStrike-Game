'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TrackData {
  callsign: string;
  speed?: number; // knots
  altitude?: number; // feet
  heading?: number; // degrees
  probability?: number; // 0-1
}

interface TrackBadgeProps {
  track: TrackData;
  selected?: boolean;
  variant?: 'friendly' | 'hostile' | 'unknown';
  size?: 'sm' | 'md' | 'lg';
  showGlyph?: boolean;
  className?: string;
}

export function TrackBadge({
  track,
  selected = false,
  variant = 'unknown',
  size = 'md',
  showGlyph = true,
  className
}: TrackBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'friendly':
        return 'text-ok border-ok/40 bg-ok/5';
      case 'hostile':
        return 'text-warn border-warn/40 bg-warn/5';
      default:
        return 'text-accent border-accent/40 bg-accent/5';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs p-1.5 gap-1.5';
      case 'lg':
        return 'text-sm p-3 gap-3';
      default:
        return 'text-xs p-2 gap-2';
    }
  };

  const formatCallsign = (callsign: string) => {
    if (callsign.length <= 8) return callsign;
    // Middle ellipsis for long callsigns
    return `${callsign.slice(0, 3)}…${callsign.slice(-3)}`;
  };

  const formatHeading = (heading?: number) => {
    if (heading === undefined) return '---°';
    return `${heading.toString().padStart(3, '0')}°`;
  };

  const formatAltitude = (altitude?: number) => {
    if (altitude === undefined) return '-----';
    return `${Math.round(altitude / 100)}00`;
  };

  const formatSpeed = (speed?: number) => {
    if (speed === undefined) return '---';
    return speed.toString().padStart(3, '0');
  };

  return (
    <div
      className={cn(
        'inline-flex items-center border rounded-xl transition-all duration-fast cursor-pointer',
        getSizeStyles(),
        getVariantStyles(),
        selected && 'shadow-glow ring-2 ring-current ring-opacity-20',
        isHovered && 'shadow-glow-focus scale-[1.02]',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Aircraft glyph */}
      {showGlyph && (
        <div className="relative">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            className={cn(
              'transform transition-transform duration-fast',
              track.heading && `rotate-[${track.heading}deg]`
            )}
          >
            <path
              d="M12 2 L20 14 L16 12 L12 16 L8 12 L4 14 Z"
              fill="currentColor"
              stroke="rgba(167, 241, 255, 0.8)"
              strokeWidth="1"
            />
          </svg>
        </div>
      )}

      {/* Track info */}
      <div className="flex flex-col min-w-0">
        {/* Callsign */}
        <div className="font-mono font-medium leading-tight">
          {formatCallsign(track.callsign)}
        </div>

        {/* Telemetry */}
        <div className="flex items-center gap-2 text-xs font-mono text-current/70 tabular-nums">
          {track.speed !== undefined && (
            <span title="Speed (knots)">
              {formatSpeed(track.speed)}kt
            </span>
          )}
          
          {track.altitude !== undefined && (
            <span title="Altitude (hundreds of feet)">
              {formatAltitude(track.altitude)}
            </span>
          )}

          {track.heading !== undefined && (
            <span title="Heading (degrees)">
              {formatHeading(track.heading)}
            </span>
          )}
        </div>

        {/* Probability */}
        {track.probability !== undefined && (
          <div className="text-xs font-mono text-current/60 tabular-nums">
            P: {(track.probability * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}