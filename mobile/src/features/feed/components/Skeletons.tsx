import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../theme';
import { Shimmer } from '../../../components/common/Loader';

/**
 * Purpose: Centralized library of design-system shimmer skeleton loaders.
 */

export function HeaderSkeleton() {
  const { spacing } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.md }]}>
      <View style={styles.row}>
        <View style={{ gap: 6 }}>
          <Shimmer width={100} height={14} />
          <Shimmer width={160} height={24} />
        </View>
        <Shimmer width={36} height={36} borderRadius={18} />
      </View>
      <Shimmer width={220} height={14} style={{ marginTop: spacing.xs }} />
      <Shimmer width="100%" height={44} borderRadius={8} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

export function CardSkeleton() {
  const { spacing, radius } = useTheme();

  return (
    <View style={[styles.card, { padding: spacing.md, marginHorizontal: spacing.md, marginVertical: spacing.xs, borderRadius: radius.md }]}>
      <View style={styles.row}>
        <Shimmer width={120} height={16} />
        <Shimmer width={80} height={16} />
      </View>
      <Shimmer width="90%" height={20} style={{ marginTop: spacing.sm }} />
      <Shimmer width="100%" height={14} style={{ marginTop: spacing.xs }} />
      <Shimmer width="70%" height={14} style={{ marginTop: spacing.xxs }} />
      <View style={[styles.row, { marginTop: spacing.md }]}>
        <Shimmer width={100} height={24} borderRadius={12} />
        <Shimmer width={40} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

export function TrendingSkeleton() {
  const { spacing, radius } = useTheme();

  return (
    <View style={{ paddingLeft: spacing.md, marginVertical: spacing.sm }}>
      <Shimmer width={150} height={20} style={{ marginBottom: spacing.sm }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[1, 2].map((i) => (
          <View key={i} style={[styles.trendingCard, { width: 140, height: 160, borderRadius: radius.md, padding: spacing.sm }]}>
            <Shimmer width={100} height={14} />
            <Shimmer width={120} height={32} style={{ marginTop: spacing.xs }} />
            <Shimmer width={60} height={14} style={{ marginTop: 'auto' }} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function TimelineSkeleton() {
  const { spacing } = useTheme();

  return (
    <View style={{ padding: spacing.md }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
          <View style={{ alignItems: 'center' }}>
            <Shimmer width={12} height={12} borderRadius={6} />
            <View style={{ width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 4 }} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Shimmer width={80} height={14} />
            <Shimmer width={180} height={16} />
            <Shimmer width="100%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function RecommendationSkeleton() {
  const { spacing, radius } = useTheme();

  return (
    <View style={[styles.card, { padding: spacing.md, marginHorizontal: spacing.md, marginVertical: spacing.xs, borderRadius: radius.md }]}>
      <Shimmer width={240} height={14} style={{ marginBottom: spacing.sm }} />
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: spacing.sm }} />
      <Shimmer width="85%" height={18} style={{ marginBottom: spacing.xs }} />
      <Shimmer width="100%" height={12} style={{ marginBottom: spacing.xs }} />
      <Shimmer width="40%" height={12} style={{ marginBottom: spacing.md }} />
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <Shimmer width={70} height={20} borderRadius={10} />
        <Shimmer width={70} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  trendingCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});
