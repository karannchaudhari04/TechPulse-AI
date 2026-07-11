import { Platform } from 'react-native';

export const fontFamilies = {
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }),
  mono: Platform.select({
    ios: 'Courier',
    android: 'monospace',
    default: 'monospace',
  }),
};

export const fontWeights = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
};

export const lineHeights = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 26,
  xl: 28,
  xxl: 32,
  xxxl: 38,
  display: 44,
};

export const typography = {
  display: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.display,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.display,
  },
  heading: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.xxxl,
  },
  titleLarge: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.xxl,
  },
  titleMedium: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.xl,
  },
  titleSmall: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.lg,
  },
  bodyLarge: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.md,
  },
  bodyMedium: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.sm,
  },
  bodySmall: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.xs,
  },
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.light,
    lineHeight: lineHeights.xs,
  },
  button: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.sm,
  },
  monospace: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.sm,
  },
};
