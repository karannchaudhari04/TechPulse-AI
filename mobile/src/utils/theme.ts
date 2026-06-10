import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@theme_mode_amoled';

type ThemeListener = (isAmoled: boolean) => void;

class ThemeManager {
  private isAmoled: boolean = false;
  private listeners: Set<ThemeListener> = new Set();
  private initialized: boolean = false;

  async init() {
    if (this.initialized) return;
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      this.isAmoled = stored === 'true';
      this.initialized = true;
      this.notify();
    } catch (err) {
      console.error('[ThemeManager] Init failed:', err);
    }
  }

  getIsAmoled() {
    return this.isAmoled;
  }

  async setAmoled(status: boolean) {
    if (this.isAmoled !== status) {
      this.isAmoled = status;
      try {
        await AsyncStorage.setItem(THEME_KEY, String(status));
      } catch (err) {
        console.error('[ThemeManager] Set failed:', err);
      }
      this.notify();
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isAmoled);
      } catch (err) {
        console.error('[ThemeManager] Listener notification error:', err);
      }
    });
  }

  subscribe(listener: ThemeListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const themeManager = new ThemeManager();

// Initialize the theme manager early on import
themeManager.init();

export function useTheme() {
  const [isAmoled, setIsAmoled] = useState(themeManager.getIsAmoled());

  useEffect(() => {
    // Sync initial state on mount
    themeManager.init().then(() => {
      setIsAmoled(themeManager.getIsAmoled());
    });

    const unsubscribe = themeManager.subscribe((status) => {
      setIsAmoled(status);
    });
    return unsubscribe;
  }, []);

  const colors = {
    // Dynamic styling variables
    background: isAmoled ? '#000000' : '#0F172A',
    cardBackground: isAmoled ? '#000000' : '#0F172A',
    rootBackground: isAmoled ? '#000000' : '#020617',
    border: isAmoled ? '#1A1A1A' : 'rgba(255,255,255,0.05)',
    divider: isAmoled ? '#111111' : 'rgba(255,255,255,0.05)',
  };

  return {
    isAmoled,
    setAmoled: (status: boolean) => themeManager.setAmoled(status),
    colors,
  };
}
