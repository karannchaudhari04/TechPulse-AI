import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../../theme';
import Icon from '../../../components/common/Icon';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onFilterPress: () => void;
  searchMode: 'semantic' | 'keyword';
  onModeToggle: () => void;
}

/**
 * Purpose: Premium search input bar with AI mode triggers, clear actions, and voice search indicators.
 */
export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  onFilterPress,
  searchMode,
  onModeToggle,
}: SearchBarProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.md, paddingVertical: spacing.xs }]}>
      <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search" provider="feather" size={18} color={colors.textMuted} />
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="Search technology updates..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />

        {value.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear query text">
            <Icon name="x-circle" provider="ionicons" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.micBtn} 
          onPress={() => console.info('[Voice] Voice search clicked (UI Placeholder)')}
          accessibilityRole="button"
          accessibilityLabel="Voice search"
        >
          <Icon name="mic" provider="feather" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.modeContainer}>
          <Text style={[styles.modeLabel, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
            Search Mode:
          </Text>
          <TouchableOpacity 
            onPress={onModeToggle}
            style={[styles.toggleBtn, { 
              backgroundColor: searchMode === 'semantic' ? colors.primary : colors.divider,
              borderColor: colors.border
            }]}
          >
            <Text style={[styles.toggleText, { color: searchMode === 'semantic' ? '#FFF' : colors.textPrimary }]}>
              {searchMode === 'semantic' ? '🧠 Semantic (AI)' : '🔍 Keyword'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={onFilterPress} 
          style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: colors.divider }]}
          accessibilityRole="button"
          accessibilityLabel="Open search filters"
        >
          <Icon name="sliders" provider="feather" size={14} color={colors.textPrimary} />
          <Text style={[styles.filterBtnText, { color: colors.textPrimary, fontFamily: typography.bodySmall.fontFamily }]}>
            Filters
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 14,
  },
  clearBtn: {
    padding: 4,
  },
  micBtn: {
    padding: 4,
    marginLeft: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeLabel: {
    fontSize: 12,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
