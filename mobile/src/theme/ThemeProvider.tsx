import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { StatusBar } from 'react-native';
import { amoledColors, ColorPalette } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { elevation } from './elevation';
import { zIndex } from './zIndex';
import * as animations from './animations';

export interface ThemeContextProps {
  isDark: boolean;
  isAmoled: boolean;
  colors: ColorPalette;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  zIndex: typeof zIndex;
  animations: typeof animations;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDark = true;
  const isAmoled = true;

  const themeValue: ThemeContextProps = useMemo(() => {
    return {
      isDark,
      isAmoled,
      colors: amoledColors,
      typography,
      spacing,
      radius,
      elevation,
      zIndex,
      animations,
    };
  }, []);

  useEffect(() => {
    // Configure reactive status bar style
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
