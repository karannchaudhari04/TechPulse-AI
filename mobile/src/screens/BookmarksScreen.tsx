import React from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { SafeAreaWrapper } from '../components/common/Layout';
import { useNavigation } from '@react-navigation/native';
import { 
  useGetBookmarksQuery, 
  useRemoveBookmarkMutation 
} from '../features/personalization/api/personalizationApiSlice';
import Icon from '../components/common/Icon';
import EventCard from '../features/events/components/EventCard';
import { useRecordInteractionMutation } from '../features/events/api/eventsApiSlice';

/**
 * Purpose: Saved Bookmarks viewer screen.
 * Swaps legacy TanStack queries for personalizationApiSlice hooks.
 */
export default function BookmarksScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();

  const { data: bookmarks, isLoading, refetch } = useGetBookmarksQuery();
  const [removeBookmark] = useRemoveBookmarkMutation();
  const [recordInteraction] = useRecordInteractionMutation();

  const handleBookmarkToggle = async (eventId: string) => {
    try {
      await removeBookmark(eventId).unwrap();
      refetch();
    } catch (err) {
      console.error('[Bookmarks] Failed to remove bookmark:', err);
    }
  };

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
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily }]} numberOfLines={1}>
          Saved Bookmarks
        </Text>
        <View style={styles.navButtonPlaceholder} />
      </View>

      {bookmarks && bookmarks.length === 0 ? (
        <View style={styles.center}>
          <Icon name="bookmark" provider="feather" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, marginTop: spacing.xs }]}>
            Empty Library
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xxs }]}>
            Bookmark interesting technology updates to see them here later!
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          renderItem={({ item }) => (
            <EventCard
              item={item}
              onPress={() => navigation.navigate('EventDetail', { id: item.id })}
              onBookmarkToggle={() => handleBookmarkToggle(item.id)}
            />
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
