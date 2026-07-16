import React from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGetTimelineQuery } from '../api/intelligenceApiSlice';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { SafeAreaWrapper } from '../../../components/common/Layout';

/**
 * Purpose: Timeline screen displaying chronological history lists of version releases.
 */
export default function TimelineScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, typography, spacing, radius } = useTheme();

  const { id } = route.params || { id: 'java' };
  const { data: timeline, isLoading, refetch } = useGetTimelineQuery(id);

  if (isLoading) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={[styles.navigationBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Go Back">
          <Icon name="arrow-left" provider="feather" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
          Version Release Timeline
        </Text>
        <View style={styles.navPlaceholder} />
      </View>

      {timeline && timeline.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>No timelines history recorded.</Text>
        </View>
      ) : (
        <FlatList
          data={timeline}
          contentContainerStyle={{ padding: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.timelineRow}>
              {/* Left Timeline Indicator */}
              <View style={styles.leftCol}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              </View>

              {/* Right Content details Card */}
              <Card variant="standard" style={[styles.itemCard, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.sm, padding: spacing.sm }]}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.version, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
                    Version {item.version}
                  </Text>
                  <Text style={[styles.date, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
                    {item.date}
                  </Text>
                </View>
                <Text style={[styles.headline, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.xxs }]}>
                  {item.headline}
                </Text>
                <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
                  {item.description}
                </Text>
              </Card>
            </View>
          )}
          keyExtractor={(item) => item.id}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
  },
  navPlaceholder: {
    width: 40,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    width: '100%',
  },
  leftCol: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 16,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 80,
  },
  itemCard: {
    flex: 1,
    borderWidth: 1,
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  version: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 11,
  },
  headline: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
