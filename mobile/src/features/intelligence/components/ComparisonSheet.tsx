import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../theme';

export interface ComparisonSheetProps {
  techNames: string[];
  features: string[];
  ratings: Record<string, string[]>; // e.g. { 'react': ['High', 'Easy'], 'angular': ['Medium', 'Complex'] }
  summary: string;
}

/**
 * Purpose: Technical side-by-side comparison matrix component.
 */
export default function ComparisonSheet({
  techNames,
  features,
  ratings,
  summary,
}: ComparisonSheetProps) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View style={[styles.container, { borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.cardBackground }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Header Row */}
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={[styles.cell, styles.headerCell, { width: 120 }]}>
              <Text style={[styles.headerText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
                Feature
              </Text>
            </View>
            {techNames.map((name, idx) => (
              <View key={idx} style={[styles.cell, styles.headerCell, { width: 120 }]}>
                <Text style={[styles.headerText, { color: colors.primary, fontFamily: typography.caption.fontFamily }]} numberOfLines={1}>
                  {name}
                </Text>
              </View>
            ))}
          </View>

          {/* Features Rows */}
          {features.map((feat, fIdx) => (
            <View key={fIdx} style={[styles.row, { borderBottomColor: colors.divider }]}>
              <View style={[styles.cell, { width: 120 }]}>
                <Text style={[styles.featText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]} numberOfLines={1}>
                  {feat}
                </Text>
              </View>
              {techNames.map((name, tIdx) => {
                const values = ratings[name.toLowerCase()] || [];
                const val = values[fIdx] || 'N/A';
                return (
                  <View key={tIdx} style={[styles.cell, { width: 120 }]}>
                    <Text style={[styles.valText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]} numberOfLines={1}>
                      {val}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* AI Summary Section */}
      <View style={[styles.summaryBox, { backgroundColor: colors.divider, padding: spacing.md }]}>
        <Text style={[styles.summaryTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
          AI Comparison Summary
        </Text>
        <Text style={[styles.summaryText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xxs }]}>
          {summary}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 10,
    width: '100%',
  },
  table: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  cell: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  headerCell: {
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  featText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  valText: {
    fontSize: 12,
  },
  summaryBox: {
    width: '100%',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
