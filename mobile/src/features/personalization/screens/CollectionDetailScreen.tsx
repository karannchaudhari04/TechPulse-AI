import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { 
  useGetCollectionsQuery,
  useRemoveEventFromCollectionMutation 
} from '../api/personalizationApiSlice';
import { useGetFeedQuery } from '../../feed/api/feedApiSlice';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Icon from '../../../components/common/Icon';
import EventCard from '../../events/components/EventCard';
import { useRecordInteractionMutation } from '../../events/api/eventsApiSlice';

/**
 * Purpose: Collection Details Screen displaying bookmarks inside a collection folder.
 * Supports filtering results, loading cards, and deletion mutations.
 */
export default function CollectionDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();
  
  const collectionId = route.params?.id || '';
  const [searchText, setSearchText] = useState('');

  const { data: collections, isLoading } = useGetCollectionsQuery();
  const [removeEvent] = useRemoveEventFromCollectionMutation();
  const [recordInteraction] = useRecordInteractionMutation();

  const collection = collections?.find(c => c.id === collectionId);

  const { data: feedData, isFetching, refetch } = useGetFeedQuery({
    limit: 50,
  });

  const collectionEvents = React.useMemo(() => {
    if (!collection || !feedData) return [];
    return feedData.content.filter(item => collection.events.includes(item.id));
  }, [collection, feedData]);

  const filteredEvents = React.useMemo(() => {
    return collectionEvents.filter(item => 
      item.headline.toLowerCase().includes(searchText.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [collectionEvents, searchText]);

  const handleRemoveEvent = async (eventId: string) => {
    try {
      await removeEvent({ collectionId, eventId }).unwrap();
    } catch (err) {
      console.error('[CollectionDetail] Failed to remove event:', err);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaWrapper>
    );
  }

  if (!collection) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <Text style={{ color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }}>
          Collection not found.
        </Text>
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
          {collection.name}
        </Text>
        <View style={styles.navButtonPlaceholder} />
      </View>

      <View style={[styles.searchBoxContainer, { paddingHorizontal: spacing.md, paddingVertical: spacing.xs }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="search" provider="feather" size={16} color={colors.textMuted} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search inside collection..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Icon name="x" provider="feather" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredEvents.length === 0 ? (
        <View style={styles.center}>
          <Icon name="folder-open" provider="feather" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }]}>
            No events found in this collection.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={({ item }) => (
            <View>
              <EventCard
                item={item}
                onPress={() => navigation.navigate('EventDetail', { id: item.id })}
                onBookmarkToggle={() => recordInteraction({ eventId: item.id, type: 'BOOKMARK' })}
              />
              <TouchableOpacity 
                onPress={() => handleRemoveEvent(item.id)}
                style={[styles.removeBtn, { marginRight: spacing.md, marginTop: -spacing.xs, marginBottom: spacing.sm }]}
              >
                <Icon name="trash-2" provider="feather" size={14} color={colors.danger} />
                <Text style={[styles.removeText, { color: colors.danger, fontFamily: typography.caption.fontFamily }]}>
                  Remove from collection
                </Text>
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item) => item.id}
          refreshing={isFetching}
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
  searchBoxContainer: {
    width: '100%',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 6,
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
