import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive tablet check
export const isTablet = width >= 768;

export const spacing = {
  none: 0,
  xxs: isTablet ? 6 : 4,
  xs: isTablet ? 12 : 8,
  sm: isTablet ? 18 : 12,
  md: isTablet ? 24 : 16,
  lg: isTablet ? 36 : 24,
  xl: isTablet ? 48 : 32,
  xxl: isTablet ? 72 : 48,
  xxxl: isTablet ? 96 : 64,
};

export const layout = {
  windowWidth: width,
  windowHeight: height,
  isTablet,
  screenWidth: width,
  screenHeight: height,
};
