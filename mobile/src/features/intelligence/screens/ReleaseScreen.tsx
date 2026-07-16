import React from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGetReleaseDetailsQuery } from '../api/intelligenceApiSlice';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import { RefreshControl } from 'react-native';

/**
 * Purpose: Release screen displaying release notes and compatibility matrix logs.
 */
export default function ReleaseScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, typography, spacing, radius } = useTheme();

  const { id } = route.params || { id: 'java-21' };
  const { data: release, isLoading, refetch } = useGetReleaseDetailsQuery(id);

  if (isLoading) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaWrapper>
    );
  }

  if (!release) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Release details not found.</Text>
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
          Version {release.version} Release
        </Text>
        <View style={styles.navPlaceholder} />
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: spacing.md }} 
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {/* Release Notes */}
        <Card variant="standard" style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md, padding: spacing.md }]}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
            Release Notes
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            {release.notes}
          </Text>
        </Card>

        {/* Compatibility Matrix */}
        <Card variant="standard" style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md, padding: spacing.md }]}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
            Compatibility Matrix
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            {release.compatibility}
          </Text>
        </Card>

        {/* Migration Guide */}
        {release.migrationGuide && (
          <Card variant="standard" style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md, padding: spacing.md }]}>
            <Text style={[styles.sectionHeader, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
              Migration & Upgrade Guide
            </Text>
            <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
              {release.migrationGuide}
            </Text>
          </Card>
        )}
      </ScrollView>
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
  card: {
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
