import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export type IconProvider = 'material' | 'feather' | 'ionicons' | 'community';

export interface IconProps {
  name: string;
  provider?: IconProvider;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Centralized Icon Wrapper Component.
 * Restricts direct import of vector icons packages to ensure clean upgrade paths.
 * 
 * Props:
 * - name: Name of the icon in the corresponding icon library
 * - provider: Icon set provider ('material' | 'feather' | 'ionicons' | 'community')
 * - size: Pixel size of the icon (default 24)
 * - color: Color string
 * - style: View styles overrides
 * 
 * Usage:
 * ```tsx
 * <Icon name="settings" provider="feather" size={24} color="#7C3AED" />
 * ```
 */
export default function Icon({
  name,
  provider = 'feather',
  size = 24,
  color,
  style,
}: IconProps) {
  const IconPropsList = { name, size, color, style };

  switch (provider) {
    case 'material':
      // @ts-ignore
      return <MaterialIcons {...IconPropsList} />;
    case 'ionicons':
      // @ts-ignore
      return <Ionicons {...IconPropsList} />;
    case 'community':
      // @ts-ignore
      return <MaterialCommunityIcons {...IconPropsList} />;
    case 'feather':
    default:
      // @ts-ignore
      return <Feather {...IconPropsList} />;
  }
}
