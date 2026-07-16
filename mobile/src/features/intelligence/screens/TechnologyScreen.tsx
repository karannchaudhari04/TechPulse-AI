import React from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../store';
import { pinTechnology, unpinTechnology } from '../store/workspaceSlice';
import { useGetTechnologyDetailsQuery } from '../api/intelligenceApiSlice';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import { RefreshControl } from 'react-native';

/**
 * Purpose: Detailed profile dashboard presenting technology version metrics and workspace actions.
 */
export default function TechnologyScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors, typography, spacing, radius } = useTheme();

  const { id } = route.params || { id: 'java' };
  const { data: tech, isLoading, refetch } = useGetTechnologyDetailsQuery(id);

  const pinnedTechnologies = useAppSelector(state => state.workspace.pinnedTechnologies);
  const isPinned = pinnedTechnologies.includes(id);

  const handleTogglePin = () => {
    if (isPinned) {
      dispatch(unpinTechnology(id));
    } else {
      dispatch(pinTechnology(id));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaWrapper>
    );
  }

  if (!tech) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Technology details not found.</Text>
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
          {tech.name} Profile
        </Text>
        <TouchableOpacity onPress={handleTogglePin} style={styles.navButton} accessibilityRole="button" accessibilityLabel={isPinned ? 'Unpin technology' : 'Pin technology'}>
          <Icon name="bookmark" provider="feather" size={20} color={isPinned ? colors.primary : colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: spacing.md }} 
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {/* Overview Box */}
        <Card variant="standard" style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md, padding: spacing.md }]}>
          <View style={styles.metaHeader}>
            <Text style={[styles.version, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
              Latest: {tech.latestVersion}
            </Text>
            <View style={styles.scoreRow}>
              <Icon name="trending-up" provider="feather" size={14} color={colors.success} />
              <Text style={[styles.scoreVal, { color: colors.success, fontFamily: typography.caption.fontFamily, fontWeight: 'bold' }]}>
                {tech.trendingScore}%
              </Text>
            </View>
          </View>
          <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            {tech.overview}
          </Text>
        </Card>

        {/* Breaking warnings */}
        {tech.breakingChanges && tech.breakingChanges.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
              CRITICAL BREAKING WARNINGS
            </Text>
            {tech.breakingChanges.map((change, idx) => (
              <Card key={idx} variant="standard" style={[styles.changeItem, { borderColor: colors.danger, backgroundColor: 'rgba(239,68,68,0.05)', padding: spacing.sm }]}>
                <Text style={[styles.changeText, { color: colors.danger, fontFamily: typography.bodyMedium.fontFamily }]}>
                  {change}
                </Text>
              </Card>
            ))}
          </View>
        )}

        {/* Action triggers */}
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Timeline', { id })}
            style={[styles.actionCard, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.sm }]}
          >
            <Icon name="calendar" provider="feather" size={20} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
              Release Timeline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Workspace')}
            style={[styles.actionCard, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.sm }]}
          >
            <Icon name="folder" provider="feather" size={20} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
              View Workspace
            </Text>
          </TouchableOpacity>
        </View>
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
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  version: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreVal: {
    fontSize: 12,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  changeItem: {
    borderWidth: 1,
    marginVertical: 4,
  },
  changeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
