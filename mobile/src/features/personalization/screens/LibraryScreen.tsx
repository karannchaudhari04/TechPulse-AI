import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { networkTracker } from '../../../utils/network';

import LibraryHeader from '../components/LibraryHeader';
import ContinueReadingCard from '../components/ContinueReadingCard';
import CollectionCard from '../components/CollectionCard';
import { OfflineQueueService } from '../services/OfflineQueueService';
import { usePersonalizationAnalytics } from '../hooks/usePersonalizationAnalytics';
import { 
  useGetLibraryStatsQuery, 
  useGetCollectionsQuery, 
  useGetBookmarksQuery, 
  useGetReadingHistoryQuery,
  useUpdateCollectionMutation
} from '../api/personalizationApiSlice';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';

/**
 * Purpose: Personal User Library dashboard displaying stats, continue reading progress,
 * collections grids, followed technologies, and sync counts.
 */
export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();
  const analytics = usePersonalizationAnalytics();

  const [isOnline, setIsOnline] = useState(networkTracker.getIsOnline());
  const [pendingCount, setPendingCount] = useState(0);

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useGetLibraryStatsQuery();
  const { data: collections, isLoading: isCollectionsLoading, refetch: refetchCols } = useGetCollectionsQuery();
  const { data: bookmarks, refetch: refetchBookmarks } = useGetBookmarksQuery();
  const { data: history, refetch: refetchHistory } = useGetReadingHistoryQuery();
  const [updateCollection] = useUpdateCollectionMutation();

  useEffect(() => {
    const unsubscribeNet = networkTracker.subscribe(setIsOnline);
    const unsubscribeQueue = OfflineQueueService.subscribe(setPendingCount);
    analytics.trackLibraryOpened();
    return () => {
      unsubscribeNet();
      unsubscribeQueue();
    };
  }, []);

  const handleRefresh = async () => {
    refetchStats();
    refetchCols();
    refetchBookmarks();
    refetchHistory();
  };

  const handlePinToggle = async (id: string, currentlyPinned: boolean) => {
    try {
      if (!isOnline) {
        await OfflineQueueService.enqueue('COLLECTION_RENAME', { collectionId: id, name: 'Renamed Offline' });
      } else {
        await updateCollection({ id, name: '', pinned: !currentlyPinned }).unwrap();
      }
    } catch (err) {
      console.error('[Library] Failed to toggle pin:', err);
    }
  };

  const activeHistoryItem = history && history.length > 0 ? history[0] : null;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={isStatsLoading || isCollectionsLoading} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      <LibraryHeader
        eventsRead={stats?.eventsReadCount || 0}
        savedEvents={bookmarks?.length || 0}
        collectionsCount={collections?.length || 0}
        techsFollowed={stats?.technologiesFollowedCount || 0}
      />

      {/* Offline Pending Sync Banner */}
      {pendingCount > 0 && (
        <View style={[styles.pendingBanner, { backgroundColor: colors.warning, marginHorizontal: spacing.md, marginVertical: spacing.xs }]}>
          <Icon name="cloud-offline" provider="ionicons" size={14} color="#FFF" />
          <Text style={[styles.pendingText, { fontFamily: typography.caption.fontFamily }]}>
            {pendingCount} change{pendingCount === 1 ? '' : 's'} will sync when you're back online.
          </Text>
        </View>
      )}

      {/* Continue Reading Card */}
      {activeHistoryItem && (
        <ContinueReadingCard
          headline={activeHistoryItem.headline}
          lastOpened={new Date(activeHistoryItem.lastOpened).toLocaleDateString()}
          progressPercentage={activeHistoryItem.completionPercentage}
          onResume={() => {
            analytics.trackResumeReading(activeHistoryItem.eventId);
            navigation.navigate('EventDetail', { id: activeHistoryItem.eventId });
          }}
        />
      )}

      {/* Collections grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily }]}>
            My Collections
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Collections')}>
            <Text style={[styles.seeAll, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
              Manage
            </Text>
          </TouchableOpacity>
        </View>

        {isCollectionsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : collections && collections.length > 0 ? (
          <View style={styles.collectionsGrid}>
            {collections.slice(0, 4).map(col => (
              <CollectionCard
                key={col.id}
                name={col.name}
                description={col.description}
                eventCount={col.eventCount}
                pinned={col.pinned}
                favorite={col.favorite}
                onPress={() => navigation.navigate('CollectionDetail', { id: col.id })}
                onPinToggle={() => handlePinToggle(col.id, col.pinned)}
              />
            ))}
          </View>
        ) : (
          <Card variant="standard" style={[styles.emptyBox, { borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
              No collections found. Tap 'Manage' to create one!
            </Text>
          </Card>
        )}
      </View>

      {/* Quick Access links */}
      <View style={[styles.section, { marginBottom: spacing.lg }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, paddingLeft: spacing.xs, marginBottom: spacing.xs }]}>
          Quick Access
        </Text>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('Bookmarks')}
          style={[styles.accessRow, { borderBottomColor: colors.border }]}
        >
          <Icon name="bookmark" provider="feather" size={18} color={colors.primary} />
          <Text style={[styles.accessText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
            Saved Bookmarks
          </Text>
          <Icon name="chevron-right" provider="feather" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('ReadingHistory')}
          style={[styles.accessRow, { borderBottomColor: colors.border }]}
        >
          <Icon name="clock" provider="feather" size={18} color={colors.accent} />
          <Text style={[styles.accessText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
            Reading History Logs
          </Text>
          <Icon name="chevron-right" provider="feather" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pendingText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  emptyBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  accessText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
  },
});
