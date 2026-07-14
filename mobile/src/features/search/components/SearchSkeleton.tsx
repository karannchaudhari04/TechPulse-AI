import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../theme';
import { Shimmer } from '../../../components/common/Loader';

/**
 * Purpose: Custom shimmer loading skeleton representing search results with tags and explanations.
 */
export default function SearchSkeleton() {
  const { spacing, radius } = useTheme();

  return (
    <View style={{ paddingVertical: spacing.sm }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.card, { padding: spacing.md, marginHorizontal: spacing.md, marginVertical: spacing.xs, borderRadius: radius.md }]}>
          <View style={styles.row}>
            <Shimmer width={60} height={16} />
            <Shimmer width={80} height={16} />
            <Shimmer width={30} height={16} style={{ marginLeft: 'auto' }} />
          </View>
          <Shimmer width="85%" height={18} style={{ marginTop: spacing.sm }} />
          <Shimmer width="100%" height={14} style={{ marginTop: spacing.xs }} />
          <Shimmer width="90%" height={14} style={{ marginTop: spacing.xxs }} />
          <Shimmer width="100%" height={24} borderRadius={4} style={{ marginTop: spacing.sm }} />
          <View style={[styles.row, { marginTop: spacing.md }]}>
            <Shimmer width={70} height={14} />
            <Shimmer width={70} height={14} />
            <Shimmer width={50} height={14} style={{ marginLeft: 'auto' }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
