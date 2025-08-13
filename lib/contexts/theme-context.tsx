'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isColorblindSafe: boolean;
  toggleColorblindSafe: () => void;
  getColor: (color: 'accent' | 'warn') => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const COLORBLIND_COLORS = {
  accent: '#36D6C5', // turquoise
  warn: '#FF9F40'    // orange
};

const DEFAULT_COLORS = {
  accent: '#55E3FF', // cyan
  warn: '#FF6B6B'    // red
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isColorblindSafe, setIsColorblindSafe] = useState(false);

  // Load preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('colorblind-safe-theme');
    if (saved) {
      setIsColorblindSafe(JSON.parse(saved));
    }
  }, []);

  // Apply CSS custom properties when theme changes
  useEffect(() => {
    const root = document.documentElement;
    const colors = isColorblindSafe ? COLORBLIND_COLORS : DEFAULT_COLORS;
    
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-warn', colors.warn);
    
    // Update Tailwind CSS variables too
    root.style.setProperty('--tw-color-accent', colors.accent);
    root.style.setProperty('--tw-color-warn', colors.warn);
    
    // Save preference
    localStorage.setItem('colorblind-safe-theme', JSON.stringify(isColorblindSafe));
  }, [isColorblindSafe]);

  const toggleColorblindSafe = () => {
    setIsColorblindSafe(prev => !prev);
  };

  const getColor = (color: 'accent' | 'warn') => {
    return isColorblindSafe ? COLORBLIND_COLORS[color] : DEFAULT_COLORS[color];
  };

  return (
    <ThemeContext.Provider value={{
      isColorblindSafe,
      toggleColorblindSafe,
      getColor
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}