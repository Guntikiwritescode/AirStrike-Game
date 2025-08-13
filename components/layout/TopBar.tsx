'use client';

import React, { useState, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Search, Settings, Users, Activity } from 'lucide-react';
import { useGameStore } from '@/state/useGameStore';

interface TopBarProps {
  onSeedChange?: (seed: string) => void;
  onTimeControlChange?: (action: 'play' | 'pause' | 'step' | 'reset') => void;
  onQuickSearch?: (query: string) => void;
}

export default function TopBar({ 
  onSeedChange, 
  onTimeControlChange, 
  onQuickSearch 
}: TopBarProps) {
  const { gameStarted, currentTurn, config } = useGameStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [seedInput, setSeedInput] = useState(config.seed?.toString() || '42');

  const handlePlayPause = useCallback(() => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    onTimeControlChange?.(newState ? 'play' : 'pause');
  }, [isPlaying, onTimeControlChange]);

  const handleStep = useCallback(() => {
    onTimeControlChange?.('step');
  }, [onTimeControlChange]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    onTimeControlChange?.('reset');
  }, [onTimeControlChange]);

  const handleSeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSeedInput(value);
    const numericSeed = parseInt(value) || 42;
    onSeedChange?.(value);
  }, [onSeedChange]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onQuickSearch?.(value);
  }, [onQuickSearch]);

  return (
    <div className="h-12 bg-panel border-b border-grid/40 flex items-center justify-between px-4 relative z-40">
      {/* Left Section - Project Identity */}
      <div className="flex items-center space-x-6">
        {/* Project Name */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-accent rounded-sm flex items-center justify-center">
            <Activity className="w-4 h-4 text-bg" />
          </div>
          <div className="text-ink font-semibold text-sm">
            TACTICAL ANALYTICS
          </div>
          <div className="text-muted text-xs font-mono">
            v2.1.0
          </div>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-grid/60"></div>

        {/* Seed Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-muted text-xs font-mono">SEED:</label>
          <input
            type="text"
            value={seedInput}
            onChange={handleSeedChange}
            className="w-16 h-6 bg-panel2 border border-grid/40 rounded text-xs font-mono text-ink px-2 input-micro focus-ring"
            placeholder="42"
          />
        </div>

        {/* Game Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${gameStarted ? 'bg-accent animate-pulse' : 'bg-muted/40'}`}></div>
          <span className="text-xs font-mono text-muted">
            {gameStarted ? 'LIVE' : 'PAUSED'}
          </span>
        </div>
      </div>

      {/* Center Section - Time Controls */}
      <div className="flex items-center space-x-1">
        <button
          onClick={handleReset}
          className="w-8 h-8 bg-panel2 hover:bg-grid/40 border border-grid/40 rounded flex items-center justify-center micro-hover focus-ring"
          title="Reset to Turn 0"
        >
          <SkipBack className="w-3 h-3 text-muted" />
        </button>

        <button
          onClick={handlePlayPause}
          className={`w-8 h-8 border border-grid/40 rounded flex items-center justify-center micro-hover focus-ring ${
            isPlaying 
              ? 'bg-warn/20 hover:bg-warn/30 text-warn' 
              : 'bg-accent/20 hover:bg-accent/30 text-accent'
          }`}
          title={isPlaying ? 'Pause Simulation' : 'Start Simulation'}
        >
          {isPlaying ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3 ml-0.5" />
          )}
        </button>

        <button
          onClick={handleStep}
          className="w-8 h-8 bg-panel2 hover:bg-grid/40 border border-grid/40 rounded flex items-center justify-center micro-hover focus-ring"
          title="Step Forward One Turn"
        >
          <SkipForward className="w-3 h-3 text-muted" />
        </button>

        {/* Turn Counter */}
        <div className="ml-3 px-2 py-1 bg-panel2 border border-grid/40 rounded">
          <span className="text-xs font-mono text-ink">
            T{currentTurn.toString().padStart(3, '0')}
          </span>
        </div>
      </div>

      {/* Right Section - Quick Search & Settings */}
      <div className="flex items-center space-x-3">
        {/* Quick Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Quick search..."
            className="w-48 h-8 bg-panel2 border border-grid/40 rounded pl-8 pr-3 text-xs text-ink placeholder-muted/60 input-micro focus-ring"
          />
          <Search className="absolute left-2.5 top-2 w-3 h-3 text-muted/60" />
        </div>

        {/* Entity Count */}
        <div className="flex items-center space-x-1 text-xs font-mono text-muted">
          <Users className="w-3 h-3" />
          <span>24</span>
        </div>

        {/* Settings */}
        <button
          className="w-8 h-8 bg-panel2 hover:bg-grid/40 border border-grid/40 rounded flex items-center justify-center transition-colors"
          title="Settings"
        >
          <Settings className="w-3 h-3 text-muted" />
        </button>
      </div>
    </div>
  );
}