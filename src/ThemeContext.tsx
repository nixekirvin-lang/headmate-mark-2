import React, { createContext, useContext, useEffect, useMemo } from 'react';
import chroma from 'chroma-js';
import { useAuth } from './AuthContext';
import { useSystem } from './SystemContext';
import { ThemeConfig } from './types';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (updates: Partial<ThemeConfig>) => Promise<void>;
  saveTheme: (name: string, theme: ThemeConfig) => Promise<void>;
  deleteTheme: (name: string) => Promise<void>;
  contrastWarning: boolean;
}

const DEFAULT_THEME: ThemeConfig = {
  background: '#f5f5f5',
  accent: '#a855f7',
  text: '#1a1a1a',
  isDark: false,
  highContrast: false,
  fontSize: 'medium',
  dyslexiaFont: false,
  useAlterTheme: true,
};

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  updateTheme: async () => {},
  saveTheme: async () => {},
  deleteTheme: async () => {},
  contrastWarning: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { currentFronters } = useSystem();

  const activeTheme = useMemo(() => {
    const baseTheme = profile?.themeConfig || DEFAULT_THEME;
    
    if (baseTheme.useAlterTheme && currentFronters.length > 0) {
      // Use the theme of the first fronter if they have one
      const fronterTheme = currentFronters[0].themeConfig;
      if (fronterTheme) {
        return { ...baseTheme, ...fronterTheme };
      }
    }
    
    return baseTheme;
  }, [profile?.themeConfig, currentFronters]);

  const contrastWarning = useMemo(() => {
    const contrast = chroma.contrast(activeTheme.background, activeTheme.text);
    return contrast < 4.5;
  }, [activeTheme.background, activeTheme.text]);

  useEffect(() => {
    const root = document.documentElement;
    const theme = activeTheme;

    // Background shades
    const bg = chroma(theme.background);
    const isDark = theme.isDark || bg.luminance() < 0.5;
    
    root.style.setProperty('--bg-main', theme.background);
    root.style.setProperty('--bg-surface', isDark ? bg.brighten(0.2).hex() : bg.darken(0.05).hex());
    root.style.setProperty('--bg-panel', isDark ? bg.brighten(0.4).hex() : bg.darken(0.1).hex());
    
    // Accent shades
    const accent = chroma(theme.accent);
    root.style.setProperty('--accent-main', theme.accent);
    root.style.setProperty('--accent-hover', accent.brighten(0.5).hex());
    root.style.setProperty('--accent-active', accent.darken(0.5).hex());
    root.style.setProperty('--accent-glow', accent.alpha(0.3).css());
    
    // Text tiers
    const text = chroma(theme.text);
    root.style.setProperty('--text-primary', theme.text);
    root.style.setProperty('--text-secondary', text.alpha(0.7).css());
    root.style.setProperty('--text-muted', text.alpha(0.4).css());
    
    // Font settings - small = 10% smaller, medium = normal, large = 10% larger
    const baseSize = 16;
    const fontSizePx = theme.fontSize === 'small' 
      ? baseSize * 0.9  // 10% smaller = 14.4px
      : theme.fontSize === 'large' 
        ? baseSize * 1.1  // 10% larger = 17.6px
        : baseSize;  // normal = 16px
    root.style.setProperty('--font-size-base', `${fontSizePx}px`);
    
    // Alter text color
    if (theme.alterTextColor) {
      root.style.setProperty('--alter-text-color', theme.alterTextColor);
    } else {
      root.style.setProperty('--alter-text-color', theme.text);
    }
    
    if (theme.dyslexiaFont) {
      root.classList.add('dyslexia-font');
    } else {
      root.classList.remove('dyslexia-font');
    }

    if (theme.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply dark mode class if needed
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [activeTheme]);

  const updateTheme = async (updates: Partial<ThemeConfig>) => {
    if (!user) return;
    const newTheme = { ...(profile?.themeConfig || DEFAULT_THEME), ...updates };
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        themeConfig: newTheme
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const saveTheme = async (name: string, theme: ThemeConfig) => {
    if (!user) return;
    const savedThemes = { ...(profile?.savedThemes || {}), [name]: theme };
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        savedThemes
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const deleteTheme = async (name: string) => {
    if (!user) return;
    const savedThemes = { ...(profile?.savedThemes || {}) };
    delete savedThemes[name];
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        savedThemes
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme: activeTheme, 
      updateTheme, 
      saveTheme, 
      deleteTheme,
      contrastWarning 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
