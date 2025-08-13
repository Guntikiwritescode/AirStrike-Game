'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Keyboard, X, Zap } from 'lucide-react';

export interface KeyboardShortcut {
  key: string;
  label: string;
  description: string;
  action: () => void;
  category?: string;
  disabled?: boolean;
}

export interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  showHelpModal?: boolean;
  onToggleHelp?: () => void;
}

export function KeyboardShortcuts({ 
  shortcuts, 
  enabled = true, 
  showHelpModal = false,
  onToggleHelp 
}: KeyboardShortcutsProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [recentlyPressed, setRecentlyPressed] = useState<string | null>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return;
    }

    const key = event.key.toLowerCase();
    setPressedKeys(prev => new Set(prev).add(key));

    // Find matching shortcut
    const shortcut = shortcuts.find(s => 
      s.key.toLowerCase() === key && !s.disabled
    );

    if (shortcut) {
      event.preventDefault();
      shortcut.action();
      
      // Visual feedback
      setRecentlyPressed(key);
      setTimeout(() => setRecentlyPressed(null), 200);
    }
  }, [enabled, shortcuts]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, handleKeyDown, handleKeyUp]);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <>
      {/* Recently pressed key indicator */}
      {recentlyPressed && (
        <div className="fixed top-4 right-4 z-50 pointer-events-none">
          <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
            <Zap className="w-4 h-4" />
            <span className="font-mono font-bold uppercase">{recentlyPressed}</span>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && onToggleHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-600 bg-slate-900">
              <div className="flex items-center gap-3">
                <Keyboard className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-slate-100">
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                onClick={onToggleHelp}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Close shortcuts help"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-slate-200 mb-3 border-b border-slate-600 pb-2">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map((shortcut) => (
                        <div 
                          key={shortcut.key}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            shortcut.disabled 
                              ? 'bg-slate-800/50 border-slate-700 opacity-50' 
                              : 'bg-slate-800 border-slate-600 hover:bg-slate-700/50'
                          } transition-colors`}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-slate-200">
                              {shortcut.label}
                            </div>
                            <div className="text-sm text-slate-400">
                              {shortcut.description}
                            </div>
                          </div>
                          <div className="ml-4">
                            <kbd className={`px-2 py-1 text-xs font-mono font-bold rounded border ${
                              pressedKeys.has(shortcut.key.toLowerCase())
                                ? 'bg-blue-500 text-white border-blue-400'
                                : 'bg-slate-700 text-slate-300 border-slate-600'
                            } transition-colors`}>
                              {shortcut.key.toUpperCase()}
                            </kbd>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-600 bg-slate-900">
              <div className="text-sm text-slate-400 text-center">
                Press <kbd className="px-2 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600 font-mono">?</kbd> to toggle this help
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook for managing keyboard shortcuts in components
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const [showHelp, setShowHelp] = useState(false);

  // Add help shortcut
  const allShortcuts = [
    ...shortcuts,
    {
      key: '?',
      label: 'Show Help',
      description: 'Display keyboard shortcuts',
      action: () => setShowHelp(!showHelp),
      category: 'System'
    }
  ];

  return {
    KeyboardShortcutsComponent: () => (
      <KeyboardShortcuts
        shortcuts={allShortcuts}
        enabled={enabled}
        showHelpModal={showHelp}
        onToggleHelp={() => setShowHelp(!showHelp)}
      />
    ),
    showHelp,
    setShowHelp
  };
}

// Visual indicator component for active shortcuts
export interface ShortcutIndicatorProps {
  shortcuts: Pick<KeyboardShortcut, 'key' | 'label' | 'disabled'>[];
  compact?: boolean;
  className?: string;
}

export function ShortcutIndicator({ shortcuts, compact = false, className = '' }: ShortcutIndicatorProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {shortcuts.map((shortcut) => (
        <div 
          key={shortcut.key}
          className={`flex items-center gap-2 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs ${
            shortcut.disabled ? 'opacity-50' : ''
          }`}
        >
          <kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-600 font-mono font-bold text-xs">
            {shortcut.key.toUpperCase()}
          </kbd>
          {!compact && (
            <span className="text-slate-400">{shortcut.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}