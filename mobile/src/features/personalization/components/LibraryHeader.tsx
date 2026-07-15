import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { useAppSelector } from '../../../store';
import { Avatar } from '../../../components/common/Badge';
import Card from '../../../components/common/Card';

export interface LibraryHeaderProps {
  eventsRead: number;
  savedEvents: number;
  collectionsCount: number;
  techsFollowed: number;
  streakDays?: number;
}

/**
 * Purpose: Premium user profile details header for the knowledge library dashboard.
 * Surfaces user reading metrics, stats boxes, and streak indicators.
 */
export default function LibraryHeader({
  eventsRead,
  savedEvents,
  collectionsCount,
  techsFollowed,
  streakDays = 5,
}: LibraryHeaderProps) {
  const { colors, typography, spacing } = useTheme();
  const profile = useAppSelector((state) => state.profile.profile);

  const displayName = profile?.displayName || 'Tech Explorer';

  return (
    <View style={[styles.container, { padding: spacing.md }]}>
      <View style={styles.profileRow}>
        <Avatar source={profile?.photoURL} name={displayName} size={50} />
        <View style={styles.profileText}>
          <Text style={[styles.name, { color: colors.textPrimary, fontFamily: typography.titleLarge.fontFamily }]}>
            {displayName}'s Library
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
            🔥 {streakDays} day reading streak
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { marginTop: spacing.md }]}>
        <Card variant="standard" style={[styles.statBox, { borderColor: colors.border, backgroundColor: colors.divider }]}>
          <Text style={[styles.statNum, { color: colors.primary, fontFamily: typography.titleLarge.fontFamily }]}>
            {eventsRead}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
            Events Read
          </Text>
        </Card>

        <Card variant="standard" style={[styles.statBox, { borderColor: colors.border, backgroundColor: colors.divider }]}>
          <Text style={[styles.statNum, { color: colors.accent, fontFamily: typography.titleLarge.fontFamily }]}>
            {savedEvents}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
            Saved
          </Text>
        </Card>

        <Card variant="standard" style={[styles.statBox, { borderColor: colors.border, backgroundColor: colors.divider }]}>
          <Text style={[styles.statNum, { color: colors.success, fontFamily: typography.titleLarge.fontFamily }]}>
            {collectionsCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
            Collections
          </Text>
        </Card>

        <Card variant="standard" style={[styles.statBox, { borderColor: colors.border, backgroundColor: colors.divider }]}>
          <Text style={[styles.statNum, { color: colors.info, fontFamily: typography.titleLarge.fontFamily }]}>
            {techsFollowed}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
            Follows
          </Text>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileText: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
  },
  statNum: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
