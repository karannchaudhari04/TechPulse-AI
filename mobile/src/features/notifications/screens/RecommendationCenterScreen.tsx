import React from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Icon from '../../../components/common/Icon';
import EventCard from '../../events/components/EventCard';
import { 
  useGetRecommendationsQuery, 
  useGetRecommendationExplanationsQuery 
} from '../api/recommendationApiSlice';
import { useNotificationAnalytics } from '../hooks/useNotificationAnalytics';

/**
 * Purpose: AI recommendations listings screen displaying explanation headers.
 */
export default function RecommendationCenterScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();
  const analytics = useNotificationAnalytics();

  const { data: recommendations, isLoading: isRecsLoading, refetch: refetchRecs } = useGetRecommendationsQuery();
  const { data: explanations, isLoading: isExpsLoading, refetch: refetchExps } = useGetRecommendationExplanationsQuery();

  const handleRefresh = () => {
    refetchRecs();
    refetchExps();
  };

  const getExplanation = (eventId: string) => {
    if (!explanations) return null;
    return explanations.find(exp => exp.eventId === eventId)?.reason;
  };

  if (isRecsLoading || isExpsLoading) {
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
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]} numberOfLines={1}>
          AI Recommendation Center
        </Text>
        <View style={styles.navButtonPlaceholder} />
      </View>

      {recommendations && recommendations.length === 0 ? (
        <View style={styles.center}>
          <Icon name="cpu" provider="feather" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            No recommendations generated yet. Follow some technologies to get started!
          </Text>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          renderItem={({ item }) => {
            const reason = getExplanation(item.id) || 'Recommended based on your interest profile';
            return (
              <View>
                <View style={[styles.reasonBox, { backgroundColor: colors.divider, marginHorizontal: 16, marginTop: 12, paddingVertical: 6, paddingHorizontal: 12, borderTopLeftRadius: 8, borderTopRightRadius: 8 }]}>
                  <Text style={[styles.reasonText, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
                    💡 {reason}
                  </Text>
                </View>
                <View style={{ marginTop: -12 }}>
                  <EventCard
                    item={item}
                    onPress={() => {
                      analytics.trackRecommendationOpened(item.id);
                      navigation.navigate('EventDetail', { id: item.id });
                    }}
                    onBookmarkToggle={() => {}}
                  />
                </View>
              </View>
            );
          }}
          keyExtractor={(item) => item.id}
          refreshing={isRecsLoading}
          onRefresh={handleRefresh}
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
    paddingHorizontal: 40,
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
  navButtonPlaceholder: {
    width: 40,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  reasonBox: {
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#e2e8f0',
  },
  reasonText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
