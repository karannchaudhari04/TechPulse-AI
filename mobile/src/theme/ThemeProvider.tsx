import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { setTheme, setAmoled } from '../store/slices/preferencesSlice';
import { lightColors, darkColors, amoledColors, ColorPalette } from './colors';
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
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setAmoledMode: (amoled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.preferences.theme);
  const isAmoledPreference = useAppSelector((state) => state.preferences.isAmoled);
  const systemColorScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const activeColors = useMemo(() => {
    if (isDark) {
      return isAmoledPreference ? amoledColors : darkColors;
    }
    return lightColors;
  }, [isDark, isAmoledPreference]);

  const themeValue: ThemeContextProps = useMemo(() => {
    return {
      isDark,
      isAmoled: isDark && isAmoledPreference,
      colors: activeColors,
      typography,
      spacing,
      radius,
      elevation,
      zIndex,
      animations,
      themeMode,
      setThemeMode: (mode) => dispatch(setTheme(mode)),
      setAmoledMode: (amoled) => dispatch(setAmoled(amoled)),
    };
  }, [isDark, isAmoledPreference, activeColors, themeMode, dispatch]);

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
