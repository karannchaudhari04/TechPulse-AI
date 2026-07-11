import { useTheme } from '../theme';

/**
 * Reusable utility hook for spacing tokens.
 */
export function useSpacing() {
  const { spacing } = useTheme();
  return spacing;
}
