import { useTheme as useNewTheme } from '../theme';

/**
 * Purpose: Legacy theme adapter forwarding existing utility calls to the new Design System.
 * Ensures 100% backward compatibility with screens that haven't been refactored yet.
 */
export function useTheme() {
  const newTheme = useNewTheme();

  return {
    isAmoled: newTheme.isAmoled,
    setAmoled: newTheme.setAmoledMode,
    colors: {
      background: newTheme.colors.background,
      cardBackground: newTheme.colors.cardBackground,
      rootBackground: newTheme.colors.rootBackground,
      border: newTheme.colors.border,
      divider: newTheme.colors.divider,
    },
  };
}

// Dummy adapter for legacy themeManager calls to prevent boot crashes
export const themeManager = {
  init: async () => {},
  getIsAmoled: () => false,
  setAmoled: async () => {},
  subscribe: () => () => {},
};
