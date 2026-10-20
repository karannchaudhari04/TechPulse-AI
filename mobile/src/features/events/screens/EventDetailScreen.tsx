import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { 
  useGetEventDetailsQuery, 
  useGetRelatedEventsQuery, 
  useRecordInteractionMutation 
} from '../api/eventsApiSlice';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Icon from '../../../components/common/Icon';
import { Tag } from '../../../components/common/Badge';
import { Divider } from '../../../components/common/Layout';
import EventCard from '../components/EventCard';
import { useAddBookmarkMutation, useRemoveBookmarkMutation } from '../../personalization/api/personalizationApiSlice';

/**
 * Purpose: Premium Detailed Screen displaying AI summary timelines, Knowledge Graph nodes,
 * technical impacts, migration notes, and related updates.
 */
export default function EventDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();
  const eventId = route.params?.id || '';

  const { data: event, isLoading, error, refetch } = useGetEventDetailsQuery(eventId, { skip: !eventId });
  const { data: relatedEvents } = useGetRelatedEventsQuery(eventId, { skip: !eventId });
  const [recordInteraction] = useRecordInteractionMutation();
  const [addBookmark] = useAddBookmarkMutation();
  const [removeBookmark] = useRemoveBookmarkMutation();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);

  useEffect(() => {
    if (event) setIsBookmarked(event.bookmarked);
  }, [event?.id, event?.bookmarked]);

  const handleRelatedBookmarkToggle = async (item: { id: string; bookmarked: boolean }) => {
    if (item.bookmarked) await removeBookmark(item.id).unwrap();
    else await addBookmark(item.id).unwrap();
  };

  useEffect(() => {
    if (eventId) {
      recordInteraction({ eventId, type: 'VIEW' }).catch(err => {
        console.warn('[Analytics] Failed to record view:', err);
      });
    }
  }, [eventId]);

  const articleUrl = event?.articleUrl || event?.sourceUrl || event?.officialSources?.[0]?.url || '';
  const hasArticleUrl = /^https?:\/\//i.test(articleUrl);

  const handleOpenArticle = () => {
    if (!hasArticleUrl || !event) return;
    navigation.navigate('Article', { url: articleUrl, title: event.headline });
  };

  const handleBookmarkToggle = async () => {
    if (!event || bookmarkPending) return;
    const previousValue = isBookmarked;
    setIsBookmarked(!previousValue);
    setBookmarkPending(true);
    try {
      if (previousValue) await removeBookmark(eventId).unwrap();
      else await addBookmark(eventId).unwrap();
    } catch (err) {
      setIsBookmarked(previousValue);
      console.error('[EventDetails] Failed to toggle bookmark:', err);
    } finally {
      setBookmarkPending(false);
    }
  };

  const publishedDate = event?.publishedTime ? new Date(event.publishedTime) : null;
  const publishedLabel = publishedDate && !Number.isNaN(publishedDate.getTime())
    ? publishedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date unavailable';

  if (isLoading) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaWrapper>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaWrapper style={styles.center}>
        <Icon name="alert-triangle" provider="feather" size={48} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.sm }]}>
          Failed to load event details.
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={[styles.retryButton, { backgroundColor: colors.primary, borderRadius: 8, marginTop: spacing.md }]}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
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
          Update Details
        </Text>
        <TouchableOpacity
          onPress={handleBookmarkToggle}
          style={[styles.bookmarkNavButton, { backgroundColor: colors.divider }]}
          activeOpacity={0.75}
          disabled={bookmarkPending}
          accessibilityRole="button"
          accessibilityState={{ selected: isBookmarked, busy: bookmarkPending }}
          accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark update'}
        >
          <Icon 
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            provider="ionicons" 
            size={22} 
            color={isBookmarked ? colors.primary : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { padding: spacing.md }]}>
        <View style={styles.tagsRow}>
          <Tag label={event.category} type="primary" />
          {(event.technologies || []).map(tech => (
            <Tag key={tech} label={tech} type="info" />
          ))}
        </View>

        <Text style={[styles.headline, { color: colors.textPrimary, fontFamily: typography.heading.fontFamily, marginTop: spacing.sm }]}>
          {event.headline}
        </Text>
        
        <View style={styles.metadataRow}>
          <Icon name="calendar" provider="feather" size={14} color={colors.textMuted} />
          <Text style={[styles.published, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
            Published {publishedLabel}
          </Text>
        </View>

        <View style={[styles.overviewCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, marginTop: spacing.lg, padding: spacing.md }]}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginBottom: spacing.xs }]}>
            Overview
          </Text>
          <Text style={[styles.summary, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
            {event.summary || 'No summary is available for this update.'}
          </Text>
        </View>

        {hasArticleUrl && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[styles.sectionHeader, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginBottom: spacing.xs }]}>
              Full Article
            </Text>
            <TouchableOpacity
              onPress={handleOpenArticle}
              style={[styles.sourceLink, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.sm }]}
              activeOpacity={0.75}
              accessibilityRole="link"
              accessibilityLabel="Read the complete article inside the app"
            >
              <View style={[styles.sourceIcon, { backgroundColor: colors.divider }]}>
                <Icon name="book-open" provider="feather" size={16} color={colors.primary} />
              </View>
              <View style={styles.articleLinkText}>
                <Text style={[styles.sourceText, { color: colors.textPrimary, fontFamily: typography.bodySmall.fontFamily }]} numberOfLines={1}>
                  Read full article
                </Text>
                <Text style={[styles.articleHost, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]} numberOfLines={1}>
                  {articleUrl.replace(/^https?:\/\//i, '').split('/')[0]}
                </Text>
              </View>
              <Icon name="chevron-right" provider="feather" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <Divider style={{ marginVertical: spacing.lg }} />

        {relatedEvents && relatedEvents.length > 0 && (
          <View style={{ marginTop: spacing.xs, marginBottom: spacing.xl }}>
            <Text style={[styles.sectionHeader, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, paddingLeft: spacing.xs, marginBottom: spacing.xs }]}>
              Related Updates
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {relatedEvents.map((item) => (
                <View key={item.id} style={{ width: 280, marginRight: -8 }}>
                  <EventCard
                    item={item}
                    onPress={() => navigation.push('EventDetail', { id: item.id })}
                    onBookmarkToggle={() => handleRelatedBookmarkToggle(item)}
                  />
                </View>
              ))}
            </ScrollView>
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
  errorText: {
    fontSize: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
  bookmarkNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  headline: {
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  published: {
    fontSize: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  overviewCard: {
    borderWidth: 1,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
  },
  sourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceText: {
    fontSize: 13,
    fontWeight: '500',
  },
  articleLinkText: {
    flex: 1,
  },
  articleHost: {
    fontSize: 11,
    marginTop: 2,
  },
  horizontalScroll: {
    paddingRight: 16,
  },
});
