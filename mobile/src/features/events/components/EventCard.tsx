import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../../../theme';
import { FeedItem } from '../../feed/api/feedApiSlice';
import Icon from '../../../components/common/Icon';
import Card from '../../../components/common/Card';
import { Tag } from '../../../components/common/Badge';
import { getCategoryUpdateImage } from '../../feed/utils/categoryUpdateImages';

export interface EventCardProps {
  item: FeedItem;
  onPress: () => void;
  onBookmarkToggle: () => void | Promise<void>;
  fullScreen?: boolean;
  imageHeight?: number;
}

/**
 * Purpose: Design System styled event card for the chronological technology feed.
 */
export default function EventCard({
  item,
  onPress,
  onBookmarkToggle,
  fullScreen = false,
  imageHeight,
}: EventCardProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const navigation = useNavigation<any>();
  const [bookmarked, setBookmarked] = useState(item.bookmarked);
  const [bookmarkPending, setBookmarkPending] = useState(false);

  useEffect(() => {
    setBookmarked(item.bookmarked);
  }, [item.id, item.bookmarked]);

  const handleBookmarkPress = async () => {
    if (bookmarkPending) return;

    const previousValue = bookmarked;
    setBookmarked(!previousValue);
    setBookmarkPending(true);
    try {
      await onBookmarkToggle();
    } catch (error) {
      setBookmarked(previousValue);
      console.error('[EventCard] Failed to toggle bookmark:', error);
    } finally {
      setBookmarkPending(false);
    }
  };

  const fetchedDate = item.fetchedAt;
  const categoryUpdateImage = getCategoryUpdateImage(item.id, item.category);
  const articleUrl = item.sourceUrl || '';
  const hasArticleUrl = /^https?:\/\//i.test(articleUrl);
  const parsedDate = fetchedDate ? new Date(fetchedDate) : null;
  const fetchedDateLabel = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? `${String(parsedDate.getDate()).padStart(2, '0')}-${parsedDate.toLocaleString('en', { month: 'short' }).toUpperCase()}`
    : '';
  const handleReadArticle = () => {
    if (hasArticleUrl) navigation.navigate('Article', { url: articleUrl, title: item.headline });
  };

  return (
    <View style={[styles.container, fullScreen && styles.fullScreenContainer]}>
      <Card variant="standard" style={[
        { borderColor: colors.border, backgroundColor: colors.cardBackground, padding: 0, borderRadius: radius.md },
        fullScreen && styles.fullScreenCard,
      ]}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.cardContent, fullScreen && styles.fullScreenContent]}>
          <View style={styles.imageContainer}>
            <ExpoImage
              source={categoryUpdateImage}
              style={[styles.image, fullScreen && styles.fullScreenImage, fullScreen && { height: imageHeight ?? 120 }]}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={100}
              accessibilityLabel={`Image for ${item.category} update`}
            />
            <Text style={[styles.date, { fontFamily: typography.caption.fontFamily }]}>
              {fetchedDateLabel ? `Fetched ${fetchedDateLabel}` : ''}
            </Text>
          </View>

          <View style={[{ padding: spacing.md }, fullScreen && styles.fullScreenBody]}>
            <Text
              style={[
                styles.headline,
                { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, marginTop: spacing.xs }
              ]}
              numberOfLines={fullScreen ? undefined : 2}
            >
              {item.headline}
            </Text>

            <View style={styles.sourceMetadata}>
              <Icon name="globe" provider="feather" size={14} color={colors.textMuted} />
              <Text
                style={[styles.sourceMetadataText, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}
                numberOfLines={1}
              >
                {item.sourceName || 'Source'}
              </Text>
            </View>

            <Text
              style={[
                styles.summary,
                { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }
              ]}
              numberOfLines={fullScreen ? 6 : 3}
            >
              {item.summary}
            </Text>
            <Tag label={item.category} type="primary" style={{ marginTop: fullScreen ? 'auto' : spacing.md }} />
          </View>
        </TouchableOpacity>

        <View style={[styles.bookmarkRow, { backgroundColor: colors.divider, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleReadArticle}
            style={styles.readArticleButton}
            activeOpacity={0.75}
            disabled={!hasArticleUrl}
            accessibilityRole="link"
            accessibilityLabel={hasArticleUrl ? 'Read full article inside the app' : 'Article link unavailable'}
          >
            <Icon name="book-open" provider="feather" size={16} color={hasArticleUrl ? colors.primary : colors.textMuted} />
            <Text style={[styles.readArticleText, { color: hasArticleUrl ? colors.primary : colors.textMuted, fontFamily: typography.bodySmall.fontFamily }]}>
              {hasArticleUrl ? 'Read full article' : 'Article unavailable'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBookmarkPress}
            style={[styles.bookmarkButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            activeOpacity={0.75}
            disabled={bookmarkPending}
            accessibilityRole="button"
            accessibilityState={{ selected: bookmarked, busy: bookmarkPending }}
            accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark update'}
          >
            <Icon
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              provider="ionicons"
              size={20}
              color={bookmarked ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  fullScreenContainer: {
    flex: 1,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  fullScreenCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardContent: {
    width: '100%',
  },
  fullScreenContent: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  date: {
    position: 'absolute',
    top: 10,
    right: 10,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    overflow: 'hidden',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  bookmarkButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  readArticleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 4,
  },
  readArticleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  image: {
    width: '100%',
    height: 160,
  },
  fullScreenImage: {
    flexGrow: 0,
    flexShrink: 0,
  },
  fullScreenBody: {
    flex: 1,
  },
  headline: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
  },
  sourceMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  sourceMetadataText: {
    flex: 1,
    fontSize: 11,
  },
});
