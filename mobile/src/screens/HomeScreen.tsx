import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, RefreshControl, StyleSheet, ScrollView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';
import { networkTracker } from '../utils/network';

import HomeHeader from '../features/feed/components/HomeHeader';
import EventCard from '../features/events/components/EventCard';
import { 
  useGetFeedQuery,
  FeedItem
} from '../features/feed/api/feedApiSlice';
import { useRecordInteractionMutation } from '../features/events/api/eventsApiSlice';
import { 
  HeaderSkeleton, 
  CardSkeleton
} from '../features/feed/components/Skeletons';
import Icon from '../components/common/Icon';

const ALL_CATEGORIES = [
  { id: 'all', label: 'All Updates' },
  { id: 'AI & Machine Learning', label: 'AI & ML' },
  { id: 'Development', label: 'Development' },
  { id: 'Cloud & DevOps', label: 'Cloud' },
  { id: 'Cybersecurity', label: 'Security' },
];

/**
 * Purpose: Streamlined Tech Intelligence Dashboard screen.
 * Displays a date-ordered technology updates feed and category filters.
 */
export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();
  
  const [isOnline, setIsOnline] = useState(networkTracker.getIsOnline());
  const [activeCategory, setActiveCategory] = useState('all');
  const [cursor, setCursor] = useState<string | null>(null);
  const [accumulatedFeed, setAccumulatedFeed] = useState<FeedItem[]>([]);
  const [feedPageHeight, setFeedPageHeight] = useState(0);
  const newestFirstFeed = React.useMemo(() => [...accumulatedFeed].sort((a, b) => {
    const dateA = Date.parse(a.fetchedAt || a.publishedTime);
    const dateB = Date.parse(b.fetchedAt || b.publishedTime);
    const timestampA = Number.isNaN(dateA) ? Number.NEGATIVE_INFINITY : dateA;
    const timestampB = Number.isNaN(dateB) ? Number.NEGATIVE_INFINITY : dateB;
    return timestampB - timestampA || b.id.localeCompare(a.id);
  }), [accumulatedFeed]);

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

  const [recordInteraction] = useRecordInteractionMutation();

  // 3. Accumulate items during cursor pagination and category updates
  useEffect(() => {
    if (feedData?.content) {
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
  }, [feedData, cursor, activeCategory]);

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
    if (category !== activeCategory) {
      setActiveCategory(category);
      setCursor(null);
      setAccumulatedFeed([]);
    }
  };

  const renderHeader = useCallback(() => {
    return (
      <View>
        <HomeHeader
          onNotificationsPress={() => navigation.navigate('Notifications')}
          onProfilePress={() => navigation.navigate('Profile')}
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
  }, [navigation, colors, typography, spacing, activeCategory, isOnline]);

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
        </ScrollView>
      ) : (
        <View style={styles.feedContainer}>
          {renderHeader()}
          <View
            style={styles.pagedFeed}
            onLayout={(event) => setFeedPageHeight(event.nativeEvent.layout.height)}
          >
            <FlatList
              data={newestFirstFeed}
              renderItem={({ item }) => (
                <View style={[styles.feedPage, feedPageHeight > 0 ? { height: feedPageHeight } : null]}>
                  <EventCard
                    item={item}
                    onPress={() => navigation.navigate('EventDetail', { id: item.id })}
                    onBookmarkToggle={() => recordInteraction({ eventId: item.id, type: 'BOOKMARK' })}
                    fullScreen
                    imageHeight={feedPageHeight > 0 ? Math.round((feedPageHeight - 16) * 0.3) : 180}
                  />
                </View>
              )}
              keyExtractor={(item) => item.id}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={
                !isFeedFetching ? (
                  <View style={{ paddingVertical: spacing.xl, paddingHorizontal: spacing.md, alignItems: 'center' }}>
                    <Icon name="newspaper-outline" provider="ionicons" size={44} color={colors.textMuted} />
                    <Text style={{ color: colors.textSecondary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.sm }}>
                      No technology updates available
                    </Text>
                    <Text style={{ color: colors.textMuted, fontFamily: typography.caption.fontFamily, marginTop: spacing.xxs, textAlign: 'center' }}>
                      Pull down to refresh or select a different category filter.
                    </Text>
                  </View>
                ) : null
              }
              refreshControl={
                <RefreshControl refreshing={isFeedFetching && cursor === null} onRefresh={handleRefresh} tintColor={colors.primary} />
              }
              pagingEnabled={feedPageHeight > 0}
              disableIntervalMomentum
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              removeClippedSubviews
              initialNumToRender={2}
              maxToRenderPerBatch={1}
              updateCellsBatchingPeriod={40}
              windowSize={3}
              getItemLayout={feedPageHeight > 0
                ? (_data, index) => ({ length: feedPageHeight, offset: feedPageHeight * index, index })
                : undefined}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.8}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  feedContainer: {
    flex: 1,
  },
  pagedFeed: {
    flex: 1,
  },
  feedPage: {
    flex: 1,
    paddingHorizontal: 2,
    paddingVertical: 8,
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
