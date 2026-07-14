import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, RefreshControl, StyleSheet, ScrollView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';
import { networkTracker } from '../utils/network';

import HomeHeader from '../features/feed/components/HomeHeader';
import TechnologyChip from '../features/events/components/TechnologyChip';
import EventCard from '../features/events/components/EventCard';
import { 
  useGetFeedQuery, 
  useGetTrendsQuery, 
  useGetRecommendedFeedQuery, 
  useGetTrendingFeedQuery,
  FeedItem
} from '../features/feed/api/feedApiSlice';
import { useRecordInteractionMutation } from '../features/events/api/eventsApiSlice';
import { 
  HeaderSkeleton, 
  CardSkeleton, 
  TrendingSkeleton, 
  RecommendationSkeleton 
} from '../features/feed/components/Skeletons';
import Icon from '../components/common/Icon';
import Card from '../components/common/Card';

const ALL_CATEGORIES = [
  { id: 'all', label: 'All Updates' },
  { id: 'AI & Machine Learning', label: 'AI & ML' },
  { id: 'Web Development', label: 'Web Dev' },
  { id: 'Mobile Development', label: 'Mobile Dev' },
  { id: 'Cloud & DevOps', label: 'Cloud' },
  { id: 'Cybersecurity', label: 'Security' },
];

/**
 * Purpose: Refactored Tech Intelligence Dashboard screen.
 * Displays greeting header with real-time stats, breaking alerts, trending technologies,
 * personalized recommendations, and a vertical feed list.
 */
export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();
  
  const [isOnline, setIsOnline] = useState(networkTracker.getIsOnline());
  const [activeCategory, setActiveCategory] = useState('all');
  const [cursor, setCursor] = useState<string | null>(null);
  const [accumulatedFeed, setAccumulatedFeed] = useState<FeedItem[]>([]);

  // 1. Listen to connectivity state changes
  useEffect(() => {
    const unsubscribe = networkTracker.subscribe((status) => {
      setIsOnline(status);
    });
    return unsubscribe;
  }, []);

  // 2. Fetch Dashboard Feed and Stats
  const { data: feedData, isFetching: isFeedFetching, refetch: refetchFeed } = useGetFeedQuery({
    cursor: cursor || undefined,
    category: activeCategory === 'all' ? undefined : activeCategory,
  });

  const { data: trends, isLoading: isTrendsLoading } = useGetTrendsQuery();
  const { data: recommended, isLoading: isRecsLoading } = useGetRecommendedFeedQuery();
  const { data: trendingFeed } = useGetTrendingFeedQuery();
  const [recordInteraction] = useRecordInteractionMutation();

  // 3. Accumulate items during cursor pagination
  useEffect(() => {
    if (feedData) {
      if (cursor === null) {
        setAccumulatedFeed(feedData.content);
      } else {
        setAccumulatedFeed((prev) => {
          const ids = new Set(prev.map(i => i.id));
          const filtered = feedData.content.filter(i => !ids.has(i.id));
          return [...prev, ...filtered];
        });
      }
    }
  }, [feedData, cursor]);

  const handleRefresh = async () => {
    setCursor(null);
    refetchFeed();
  };

  const handleLoadMore = () => {
    if (feedData?.hasNext && !isFeedFetching) {
      setCursor(feedData.nextCursor);
    }
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);
    setCursor(null); // Reset cursor on filter update
  };

  const breakingEvent = useMemo(() => {
    if (!trendingFeed) return null;
    return trendingFeed.find(item => item.importanceScore >= 85) || null;
  }, [trendingFeed]);

  const renderHeader = () => {
    return (
      <View>
        <HomeHeader
          onSearchPress={() => navigation.navigate('Search')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          breakingCount={breakingEvent ? 1 : 0}
          trendsCount={trends?.length || 0}
        />

        {/* Offline Mode Banner */}
        {!isOnline && (
          <View style={[styles.offlineBanner, { backgroundColor: colors.danger, marginHorizontal: spacing.md, marginTop: spacing.xs }]}>
            <Icon name="cloud-offline" provider="ionicons" size={14} color="#FFF" />
            <Text style={[styles.offlineText, { fontFamily: typography.caption.fontFamily }]}>
              Offline mode. Displaying cached technology updates.
            </Text>
          </View>
        )}

        {/* Breaking Release Banner */}
        {breakingEvent && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('EventDetail', { id: breakingEvent.id })}
            activeOpacity={0.9}
            style={styles.sectionSpacing}
          >
            <Card variant="elevated" style={[styles.breakingCard, { borderColor: colors.danger, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
              <View style={styles.breakingHeader}>
                <Icon name="alert-circle" provider="feather" size={18} color={colors.danger} />
                <Text style={[styles.breakingTitle, { color: colors.danger, fontFamily: typography.titleSmall.fontFamily }]}>
                  BREAKING ALERTS
                </Text>
              </View>
              <Text style={[styles.breakingText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xxs }]}>
                {breakingEvent.headline}
              </Text>
            </Card>
          </TouchableOpacity>
        )}

        {/* Trending Technologies Carousel */}
        <View style={styles.sectionSpacing}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, paddingLeft: spacing.md }]}>
            Trending Technologies
          </Text>
          {isTrendsLoading ? (
            <TrendingSkeleton />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalList, { paddingLeft: spacing.md }]}>
              {trends?.map((item) => (
                <View key={item.name} style={{ marginRight: spacing.xs }}>
                  <TechnologyChip 
                    name={item.name} 
                    following={item.following} 
                    trendStatus={item.trendStatus} 
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Recommended Updates Carousel */}
        {recommended && recommended.length > 0 && (
          <View style={styles.sectionSpacing}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, paddingLeft: spacing.md }]}>
              AI Highlights For You
            </Text>
            {isRecsLoading ? (
              <RecommendationSkeleton />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalList, { paddingLeft: spacing.md }]}>
                {recommended.map((item) => (
                  <View key={item.id} style={{ width: 280, marginRight: -8 }}>
                    <EventCard
                      item={item}
                      onPress={() => navigation.navigate('EventDetail', { id: item.id })}
                      onBookmarkToggle={() => recordInteraction({ eventId: item.id, type: 'BOOKMARK' })}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Main Feed Filters */}
        <View style={[styles.filtersContainer, { marginTop: spacing.md }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalList, { paddingLeft: spacing.md }]}>
            {ALL_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleCategorySelect(cat.id)}
                style={[
                  styles.filterBtn,
                  {
                    backgroundColor: activeCategory === cat.id ? colors.primary : colors.divider,
                    borderColor: activeCategory === cat.id ? colors.primary : colors.border,
                    borderRadius: 20,
                    marginRight: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xxs,
                  }
                ]}
              >
                <Text style={[
                  styles.filterText,
                  { 
                    color: activeCategory === cat.id ? '#FFFFFF' : colors.textSecondary,
                    fontFamily: typography.bodySmall.fontFamily
                  }
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (isFeedFetching) {
      return (
        <View style={styles.loaderFooter}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {isFeedFetching && accumulatedFeed.length === 0 ? (
        <ScrollView>
          <HeaderSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={accumulatedFeed}
          renderItem={({ item }) => (
            <EventCard
              item={item}
              onPress={() => navigation.navigate('EventDetail', { id: item.id })}
              onBookmarkToggle={() => recordInteraction({ eventId: item.id, type: 'BOOKMARK' })}
            />
          )}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={isFeedFetching && cursor === null} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  offlineText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionSpacing: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  breakingCard: {
    marginHorizontal: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  breakingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakingTitle: {
    fontSize: 11,
    fontWeight: '900',
  },
  breakingText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  horizontalList: {
    paddingRight: 16,
  },
  filtersContainer: {
    paddingBottom: 8,
  },
  filterBtn: {
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loaderFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
