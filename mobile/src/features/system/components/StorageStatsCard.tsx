import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { StorageStats } from '../storage/StorageManagerService';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';

export interface StorageStatsCardProps {
  stats: StorageStats;
  onClearCategory: (category: 'feed' | 'search' | 'assistant' | 'images' | 'all') => void;
}

/**
 * Purpose: Storage usage dashboard rendering category bars and selective clear triggers.
 */
export default function StorageStatsCard({ stats, onClearCategory }: StorageStatsCardProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <Card variant="standard" style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md, padding: spacing.md }]}>
      <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
        Device Storage Breakdown
      </Text>
      
      <View style={[styles.totalRow, { borderBottomColor: colors.border, paddingBottom: spacing.sm, marginBottom: spacing.sm }]}>
        <Text style={[styles.totalLabel, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
          Total Cache Storage Used
        </Text>
        <Text style={[styles.totalVal, { color: colors.primary, fontFamily: typography.titleLarge.fontFamily, fontWeight: 'bold' }]}>
          {stats.totalStorageMb} MB
        </Text>
      </View>

      {/* Categories breakdown rows */}
      <View style={styles.breakdownGrid}>
        {/* Images */}
        <View style={styles.row}>
          <View style={styles.infoCol}>
            <Icon name="image" provider="feather" size={14} color={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
              Images Cache
            </Text>
            <Text style={[styles.val, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
              {stats.imageSizeMb} MB
            </Text>
          </View>
          <TouchableOpacity onPress={() => onClearCategory('images')} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear images cache">
            <Icon name="trash" provider="feather" size={12} color={colors.danger} />
            <Text style={[styles.clearText, { color: colors.danger, fontFamily: typography.caption.fontFamily }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Assistant */}
        <View style={styles.row}>
          <View style={styles.infoCol}>
            <Icon name="message-square" provider="feather" size={14} color={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
              AI Chat History
            </Text>
            <Text style={[styles.val, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
              {stats.assistantSizeKb} KB
            </Text>
          </View>
          <TouchableOpacity onPress={() => onClearCategory('assistant')} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear AI Chat history">
            <Icon name="trash" provider="feather" size={12} color={colors.danger} />
            <Text style={[styles.clearText, { color: colors.danger, fontFamily: typography.caption.fontFamily }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Feed */}
        <View style={styles.row}>
          <View style={styles.infoCol}>
            <Icon name="home" provider="feather" size={14} color={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
              Offline Discovery Feeds
            </Text>
            <Text style={[styles.val, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
              {stats.feedSizeKb} KB
            </Text>
          </View>
          <TouchableOpacity onPress={() => onClearCategory('feed')} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear offline feeds">
            <Icon name="trash" provider="feather" size={12} color={colors.danger} />
            <Text style={[styles.clearText, { color: colors.danger, fontFamily: typography.caption.fontFamily }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.row}>
          <View style={styles.infoCol}>
            <Icon name="search" provider="feather" size={14} color={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
              Search Suggestions & Histories
            </Text>
            <Text style={[styles.val, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
              {stats.searchSizeKb} KB
            </Text>
          </View>
          <TouchableOpacity onPress={() => onClearCategory('search')} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear search suggestions">
            <Icon name="trash" provider="feather" size={12} color={colors.danger} />
            <Text style={[styles.clearText, { color: colors.danger, fontFamily: typography.caption.fontFamily }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        onPress={() => onClearCategory('all')} 
        style={[styles.clearAllBtn, { backgroundColor: colors.danger, borderRadius: radius.sm, marginTop: spacing.md }]}
        accessibilityRole="button"
        accessibilityLabel="Clear all storage cache"
      >
        <Text style={[styles.clearAllText, { fontFamily: typography.bodyMedium.fontFamily }]}>
          Clear All System Caches
        </Text>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  totalLabel: {
    fontSize: 13,
  },
  totalVal: {
    fontSize: 18,
  },
  breakdownGrid: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  val: {
    fontSize: 11,
    marginLeft: 4,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  clearText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  clearAllBtn: {
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearAllText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
