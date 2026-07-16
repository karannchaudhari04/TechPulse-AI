import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import Icon from '../../../components/common/Icon';

export interface GraphNodeProps {
  id: string;
  label: string;
  type: 'technology' | 'company' | 'language' | 'cve' | 'cloud' | 'library';
  onPress?: () => void;
}

/**
 * Purpose: Graph node component representing technology entities.
 */
export default function GraphNode({ label, type, onPress }: GraphNodeProps) {
  const { colors, typography, radius } = useTheme();

  const getIcon = () => {
    switch (type) {
      case 'technology': return 'cpu';
      case 'company': return 'briefcase';
      case 'language': return 'code';
      case 'cve': return 'shield';
      case 'cloud': return 'cloud';
      case 'library': return 'package';
      default: return 'help-circle';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'cve': return { bg: 'rgba(239, 68, 68, 0.1)', text: colors.danger, border: colors.danger };
      case 'company': return { bg: 'rgba(16, 185, 129, 0.1)', text: colors.success, border: colors.success };
      case 'language': return { bg: 'rgba(59, 130, 246, 0.1)', text: colors.info, border: colors.info };
      default: return { bg: colors.cardBackground, text: colors.textPrimary, border: colors.border };
    }
  };

  const resolved = getColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.node,
        {
          backgroundColor: resolved.bg,
          borderColor: resolved.border,
          borderRadius: radius.md,
        }
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Node details for ${label}`}
    >
      <Icon name={getIcon()} provider="feather" size={14} color={resolved.text} />
      <Text style={[styles.label, { color: resolved.text, fontFamily: typography.bodyMedium.fontFamily }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    gap: 8,
    margin: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
