import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
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
  onBookmarkToggle: () => void;
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

  const fetchedDate = item.fetchedAt || item.publishedTime;
  const categoryUpdateImage = getCategoryUpdateImage(item.id, item.category);
  const parsedDate = fetchedDate ? new Date(fetchedDate) : null;
  const fetchedDateLabel = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? `${String(parsedDate.getDate()).padStart(2, '0')}-${parsedDate.toLocaleString('en', { month: 'short' }).toUpperCase()}`
    : '';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.container, fullScreen && styles.fullScreenContainer]}>
      <Card variant="standard" style={[
        { borderColor: colors.border, backgroundColor: colors.cardBackground, padding: 0, borderRadius: radius.md },
        fullScreen && styles.fullScreenCard,
      ]}>
        <View style={[styles.dateRow, { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm }]}>
          <TouchableOpacity onPress={onBookmarkToggle} style={styles.bookmarkButton} accessibilityRole="button" accessibilityLabel="Bookmark Event">
            <Icon 
              name={item.bookmarked ? 'bookmark' : 'bookmark-outline'} 
              provider="ionicons" 
              size={20} 
              color={item.bookmarked ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          <Text style={[styles.date, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
            {fetchedDateLabel}
          </Text>
        </View>

        <ExpoImage
          source={categoryUpdateImage}
          style={[styles.image, fullScreen && styles.fullScreenImage, fullScreen && { height: imageHeight ?? 120 }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={100}
          accessibilityLabel={`Image for ${item.category} update`}
        />

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

          <Text
            style={[
              styles.summary,
              { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xs }
            ]}
            numberOfLines={fullScreen ? undefined : 3}
          >
            {item.summary}
          </Text>

          <View style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
            <Tag label={item.category} type="primary" />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  bookmarkButton: {
    paddingVertical: 2,
    paddingRight: 8,
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
});
