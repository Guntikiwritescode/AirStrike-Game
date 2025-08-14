'use client';

import { useEffect, useCallback } from 'react';
import { HeatmapType, SensorType } from '@/lib/types';

export interface KeyboardShortcuts {
  // Sensor shortcuts
  '1': () => void; // Optical sensor
  '2': () => void; // Radar sensor  
  '3': () => void; // Thermal sensor
  
  // View mode shortcuts
  'e': () => void; // Expected Value
  'v': () => void; // VOI (variance/uncertainty)
  'r': () => void; // Risk
  'p': () => void; // Posterior
  't': () => void; // Truth
  
  // Action shortcuts
  's': () => void; // Strike mode
  'l': () => void; // Toggle labels
  'escape': () => void; // Cancel/deselect
  
  // Interface shortcuts
  'ctrl+d': () => void; // Debug panel
  'ctrl+h': () => void; // Help/shortcuts
  'space': () => void; // Play/pause
}

export interface UseKeyboardShortcutsProps {
  onSensorChange?: (sensor: SensorType) => void;
  onViewModeChange?: (mode: HeatmapType) => void;
  onStrikeMode?: () => void;
  onToggleLabels?: () => void;
  onToggleDebug?: () => void;
  onToggleHelp?: () => void;
  onPlayPause?: () => void;
  onCancel?: () => void;
  enabled?: boolean;
}

// Keyboard shortcut descriptions for help
export const KEYBOARD_SHORTCUTS_HELP = {
  sensors: [
    { key: '1', action: 'Optical Sensor', description: 'Switch to optical reconnaissance' },
    { key: '2', action: 'Radar Sensor', description: 'Switch to radar reconnaissance' },
    { key: '3', action: 'Thermal Sensor', description: 'Switch to thermal reconnaissance' }
  ],
  views: [
    { key: 'E', action: 'Expected Value', description: 'Show expected value heatmap' },
    { key: 'V', action: 'VOI/Variance', description: 'Show uncertainty/variance' },
    { key: 'R', action: 'Risk Level', description: 'Show risk assessment overlay' },
    { key: 'P', action: 'Posterior', description: 'Show posterior probability' },
    { key: 'T', action: 'Truth', description: 'Show ground truth overlay' }
  ],
  actions: [
    { key: 'S', action: 'Strike Mode', description: 'Enter kinetic strike mode' },
    { key: 'L', action: 'Toggle Labels', description: 'Show/hide map labels' },
    { key: 'Space', action: 'Play/Pause', description: 'Pause or resume simulation' },
    { key: 'Esc', action: 'Cancel', description: 'Cancel current action' }
  ],
  interface: [
    { key: 'Ctrl+D', action: 'Debug Panel', description: 'Toggle performance debug panel' },
    { key: 'Ctrl+H', action: 'Help', description: 'Show keyboard shortcuts' }
  ]
};

export function useKeyboardShortcuts({
  onSensorChange,
  onViewModeChange,
  onStrikeMode,
  onToggleLabels,
  onToggleDebug,
  onToggleHelp,
  onPlayPause,
  onCancel,
  enabled = true
}: UseKeyboardShortcutsProps) {

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const key = event.key.toLowerCase();
    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;
    const isAlt = event.altKey;

    // Prevent default for handled shortcuts
    let preventDefault = true;

    // Handle shortcuts
    if (isCtrl && !isShift && !isAlt) {
      switch (key) {
        case 'd':
          onToggleDebug?.();
          break;
        case 'h':
          onToggleHelp?.();
          break;
        default:
          preventDefault = false;
      }
    } else if (!isCtrl && !isShift && !isAlt) {
      switch (key) {
        // Sensor shortcuts
        case '1':
          onSensorChange?.('optical' as SensorType);
          break;
        case '2':
          onSensorChange?.('radar' as SensorType);
          break;
        case '3':
          onSensorChange?.('thermal' as SensorType);
          break;

        // View mode shortcuts
        case 'e':
          onViewModeChange?.('expectedValue' as HeatmapType);
          break;
        case 'v':
          onViewModeChange?.('variance' as HeatmapType);
          break;
        case 'r':
          onViewModeChange?.('riskAverse' as HeatmapType);
          break;
        case 'p':
          onViewModeChange?.('posterior' as HeatmapType);
          break;
        case 't':
          onViewModeChange?.('truth' as HeatmapType);
          break;

        // Action shortcuts
        case 's':
          onStrikeMode?.();
          break;
        case 'l':
          onToggleLabels?.();
          break;
        case ' ':
          onPlayPause?.();
          break;
        case 'escape':
          onCancel?.();
          break;
        
        default:
          preventDefault = false;
      }
    } else {
      preventDefault = false;
    }

    if (preventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [enabled, onSensorChange, onViewModeChange, onStrikeMode, onToggleLabels, onToggleDebug, onToggleHelp, onPlayPause, onCancel]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  // Return a function to manually trigger shortcuts (for testing or programmatic use)
  return {
    triggerShortcut: (shortcut: string) => {
      const mockEvent = new KeyboardEvent('keydown', {
        key: shortcut,
        ctrlKey: shortcut.includes('ctrl+'),
        metaKey: shortcut.includes('cmd+'),
        bubbles: true
      });
      handleKeyDown(mockEvent);
    }
  };
}

// Utility component for displaying keyboard shortcuts
export function KeyboardShortcutIndicator({ 
  shortcut, 
  className = '' 
}: { 
  shortcut: string; 
  className?: string; 
}) {
  const keys = shortcut.split('+').map(key => key.trim());
  
  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      {keys.map((key, index) => (
        <span key={index} className="flex items-center">
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-panel2 border border-grid/40 rounded text-muted">
            {key.toUpperCase()}
          </kbd>
          {index < keys.length - 1 && (
            <span className="mx-1 text-muted">+</span>
          )}
        </span>
      ))}
    </div>
  );
}

// Help modal component
export function KeyboardShortcutsHelp({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-panel border border-grid/40 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-ink">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-panel2 hover:bg-grid/40 border border-grid/40 rounded flex items-center justify-center transition-colors focus-ring"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sensors */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">Sensors</h3>
            {KEYBOARD_SHORTCUTS_HELP.sensors.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-ink">{shortcut.action}</div>
                  <div className="text-xs text-muted">{shortcut.description}</div>
                </div>
                <KeyboardShortcutIndicator shortcut={shortcut.key} />
              </div>
            ))}
          </div>

          {/* Views */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">View Modes</h3>
            {KEYBOARD_SHORTCUTS_HELP.views.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-ink">{shortcut.action}</div>
                  <div className="text-xs text-muted">{shortcut.description}</div>
                </div>
                <KeyboardShortcutIndicator shortcut={shortcut.key} />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">Actions</h3>
            {KEYBOARD_SHORTCUTS_HELP.actions.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-ink">{shortcut.action}</div>
                  <div className="text-xs text-muted">{shortcut.description}</div>
                </div>
                <KeyboardShortcutIndicator shortcut={shortcut.key} />
              </div>
            ))}
          </div>

          {/* Interface */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">Interface</h3>
            {KEYBOARD_SHORTCUTS_HELP.interface.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-ink">{shortcut.action}</div>
                  <div className="text-xs text-muted">{shortcut.description}</div>
                </div>
                <KeyboardShortcutIndicator shortcut={shortcut.key} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-grid/40">
          <p className="text-xs text-muted text-center">
            Press <KeyboardShortcutIndicator shortcut="Esc" className="inline-flex" /> to close this help
          </p>
        </div>
      </div>
    </div>
  );
}