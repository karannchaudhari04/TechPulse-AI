import React from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../store';
import { pinCompany, unpinCompany } from '../store/workspaceSlice';
import { useGetCompanyDetailsQuery } from '../api/intelligenceApiSlice';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import { RefreshControl } from 'react-native';

/**
 * Purpose: Company profile screen presenting engineering blog summaries and release lists.
 */
export default function CompanyScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors, typography, spacing, radius } = useTheme();

  const { id } = route.params || { id: 'google' };
  const { data: company, isLoading, refetch } = useGetCompanyDetailsQuery(id);

  const pinnedCompanies = useAppSelector(state => state.workspace.pinnedCompanies);
  const isPinned = pinnedCompanies.includes(id);

  const handleTogglePin = () => {
    if (isPinned) {
      dispatch(unpinCompany(id));
    } else {
      dispatch(pinCompany(id));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaWrapper>
    );
  }

  if (!company) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Company details not found.</Text>
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
          {company.name} Profile
        </Text>
        <TouchableOpacity onPress={handleTogglePin} style={styles.navButton} accessibilityRole="button" accessibilityLabel={isPinned ? 'Unpin company' : 'Pin company'}>
          <Icon name="bookmark" provider="feather" size={20} color={isPinned ? colors.primary : colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: spacing.md }} 
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {/* AI Summary Card */}
        <Card variant="standard" style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md, padding: spacing.md }]}>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]}>
            AI Engineering Summary
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            {company.aiSummary}
          </Text>
        </Card>

        {/* Latest Announcements */}
        {company.announcements && company.announcements.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
              LATEST TECH ANNOUNCEMENTS
            </Text>
            {company.announcements.map((ann, idx) => (
              <Card key={idx} variant="standard" style={[styles.itemCard, { borderColor: colors.border, backgroundColor: colors.cardBackground, padding: spacing.sm }]}>
                <Text style={[styles.itemText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
                  {ann}
                </Text>
              </Card>
            ))}
          </View>
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
  summaryTitle: {
    fontSize: 13,
    fontWeight: 'bold',
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
  itemCard: {
    borderWidth: 1,
    marginVertical: 4,
  },
  itemText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
