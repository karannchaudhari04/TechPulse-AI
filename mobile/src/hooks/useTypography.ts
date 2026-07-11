import { useTheme } from '../theme';

/**
 * Reusable utility hook for typography presets.
 */
export function useTypography() {
  const { typography } = useTheme();
  return typography;
}
