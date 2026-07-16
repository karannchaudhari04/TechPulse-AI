import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../../../theme';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';

export interface CitationCardProps {
  title: string;
  source: string;
  credibility: number;
  url: string;
  onPressLink?: () => void;
}

/**
 * Purpose: Citation Card details showing credibility rating and source redirects.
 */
export default function CitationCard({
  title,
  source,
  credibility,
  url,
  onPressLink,
}: CitationCardProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const handleOpenUrl = () => {
    if (onPressLink) {
      onPressLink();
    }
    Linking.openURL(url).catch(err => {
      console.warn('[CitationCard] Failed to open URL:', err);
    });
  };

  return (
    <Card variant="standard" style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.sm }]}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.source, { color: colors.primary, fontFamily: typography.caption.fontFamily }]} numberOfLines={1}>
            {source}
          </Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.credText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
              Credibility:
            </Text>
            <Text style={[styles.credVal, { color: colors.success, fontFamily: typography.caption.fontFamily, fontWeight: 'bold' }]}>
              {credibility}%
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.xxs }]} numberOfLines={1}>
          {title}
        </Text>

        <TouchableOpacity onPress={handleOpenUrl} style={[styles.linkBtn, { marginTop: spacing.xs }]}>
          <Icon name="external-link" provider="feather" size={12} color={colors.primary} />
          <Text style={[styles.linkText, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
            Visit Source Reference
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    borderWidth: 1,
    padding: 10,
    width: 260,
    marginRight: 8,
  },
  content: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  source: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    maxWidth: '50%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  credText: {
    fontSize: 10,
  },
  credVal: {
    fontSize: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
