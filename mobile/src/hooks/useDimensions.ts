import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

/**
 * Reusable utility hook that listens to device dimensions and tracks orientation,
 * tablet breakpoints, and screen scaling settings.
 */
export function useDimensions() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const isPortrait = dimensions.height >= dimensions.width;
  const isTablet = dimensions.width >= 768;

  return {
    width: dimensions.width,
    height: dimensions.height,
    scale: dimensions.scale,
    fontScale: dimensions.fontScale,
    isPortrait,
    isLandscape: !isPortrait,
    isTablet,
  };
}
