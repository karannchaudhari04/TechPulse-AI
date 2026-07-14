import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { 
  useGetEventDetailsQuery, 
  useGetRelatedEventsQuery, 
  useRecordInteractionMutation 
} from '../api/eventsApiSlice';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { Tag } from '../../../components/common/Badge';
import AIInsightCard from '../components/AIInsightCard';
import { Divider } from '../../../components/common/Layout';
import EventCard from '../components/EventCard';

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

  useEffect(() => {
    if (eventId) {
      recordInteraction({ eventId, type: 'VIEW' }).catch(err => {
        console.warn('[Analytics] Failed to record view:', err);
      });
    }
  }, [eventId]);

  const handleSourcePress = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('[Browser] Failed to open URL:', err);
    });
  };

  const handleBookmarkToggle = async () => {
    if (!event) return;
    try {
      await recordInteraction({ eventId, type: 'BOOKMARK' }).unwrap();
      refetch();
    } catch (err) {
      console.error('[EventDetails] Failed to toggle bookmark:', err);
    }
  };

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
          Event Analysis
        </Text>
        <TouchableOpacity onPress={handleBookmarkToggle} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Toggle Bookmark">
          <Icon 
            name={event.bookmarked ? 'bookmark' : 'bookmark-outline'} 
            provider="ionicons" 
            size={22} 
            color={event.bookmarked ? colors.primary : colors.textPrimary} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { padding: spacing.md }]}>
        <View style={styles.tagsRow}>
          <Tag label={event.category} type="primary" />
          {event.technologies.map(tech => (
            <Tag key={tech} label={tech} type="info" />
          ))}
        </View>

        <Text style={[styles.headline, { color: colors.textPrimary, fontFamily: typography.heading.fontFamily, marginTop: spacing.sm }]}>
          {event.headline}
        </Text>
        
        <Text style={[styles.published, { color: colors.textMuted, fontFamily: typography.caption.fontFamily, marginTop: spacing.xxs }]}>
          Published {event.publishedTime}
        </Text>

        <Text style={[styles.summary, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.md }]}>
          {event.summary}
        </Text>

        <Divider style={{ marginVertical: spacing.md }} />

        <AIInsightCard 
          technicalImpact={event.technicalImpact}
          developerImpact={event.developerImpact}
          enterpriseImpact={event.enterpriseImpact}
          migrationNotes={event.migrationNotes}
          breakingChanges={event.breakingChanges}
          securityNotes={event.securityNotes}
          timeline={event.timeline}
          knowledgeGraph={event.knowledgeGraph}
        />

        {event.officialSources && event.officialSources.length > 0 && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={[styles.sectionHeader, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginBottom: spacing.xs }]}>
              Official Sources & References
            </Text>
            {event.officialSources.map((src, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => handleSourcePress(src.url)}
                style={[styles.sourceLink, { borderBottomColor: colors.border }]}
              >
                <Icon name="external-link" provider="feather" size={14} color={colors.primary} />
                <Text style={[styles.sourceText, { color: colors.primary, fontFamily: typography.bodySmall.fontFamily }]} numberOfLines={1}>
                  {src.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {relatedEvents && relatedEvents.length > 0 && (
          <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
            <Text style={[styles.sectionHeader, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, paddingLeft: spacing.xs, marginBottom: spacing.xs }]}>
              Related Updates & Analysis
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {relatedEvents.map((item) => (
                <View key={item.id} style={{ width: 280, marginRight: -8 }}>
                  <EventCard 
                    item={item} 
                    onPress={() => navigation.push('EventDetail', { id: item.id })}
                    onBookmarkToggle={() => recordInteraction({ eventId: item.id, type: 'BOOKMARK' })}
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
    borderBottomWidth: 1,
  },
  sourceText: {
    fontSize: 13,
    fontWeight: '500',
  },
  horizontalScroll: {
    paddingRight: 16,
  },
});
