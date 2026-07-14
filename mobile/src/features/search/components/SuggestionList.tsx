import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../theme';
import Icon from '../../../components/common/Icon';
import { SearchHistoryItem } from '../api/searchApiSlice';

export interface SuggestionListProps {
  query: string;
  recentSearches: SearchHistoryItem[];
  trendingSearches?: string[];
  autocompleteSuggestions?: string[];
  onSelectQuery: (q: string) => void;
  onClearHistory?: () => void;
}

/**
 * Purpose: Contextual suggestions list displaying recent searches, autocomplete results, and trending queries.
 */
export default function SuggestionList({
  query,
  recentSearches,
  trendingSearches = [],
  autocompleteSuggestions = [],
  onSelectQuery,
  onClearHistory,
}: SuggestionListProps) {
  const { colors, typography, spacing } = useTheme();

  const hasQuery = query.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
      {hasQuery ? (
        /* Autocomplete Predictions Section */
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: typography.titleSmall.fontFamily }]}>
            Suggestions for "{query}"
          </Text>
          {autocompleteSuggestions.map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              onPress={() => onSelectQuery(item)}
              style={[styles.row, { borderBottomColor: colors.border }]}
            >
              <Icon name="search" provider="feather" size={14} color={colors.textMuted} />
              <Text style={[styles.suggestionText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]} numberOfLines={1}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
          {autocompleteSuggestions.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: typography.caption.fontFamily, marginTop: spacing.xs }]}>
              No auto-suggestions found.
            </Text>
          )}
        </View>
      ) : (
        /* Recent & Trending Queries Section */
        <View>
          {recentSearches.length > 0 && (
            <View style={{ marginBottom: spacing.md }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: typography.titleSmall.fontFamily }]}>
                  Recent Searches
                </Text>
                {onClearHistory && (
                  <TouchableOpacity onPress={onClearHistory}>
                    <Text style={[styles.clearAllText, { color: colors.primary, fontFamily: typography.caption.fontFamily }]}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {recentSearches.map((item, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  onPress={() => onSelectQuery(item.query)}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                >
                  <Icon name="clock" provider="feather" size={14} color={colors.textMuted} />
                  <Text style={[styles.suggestionText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]} numberOfLines={1}>
                    {item.query}
                  </Text>
                  <Text style={[styles.historyMode, { color: colors.textMuted, fontFamily: typography.caption.fontFamily }]}>
                    {item.searchMode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {trendingSearches.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: typography.titleSmall.fontFamily, marginBottom: spacing.xs }]}>
                Trending Searches
              </Text>
              <View style={styles.trendingWrap}>
                {trendingSearches.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    onPress={() => onSelectQuery(item)}
                    style={[styles.trendingChip, { backgroundColor: colors.divider, borderColor: colors.border }]}
                  >
                    <Icon name="trending-up" provider="feather" size={12} color={colors.primary} />
                    <Text style={[styles.trendingText, { color: colors.textPrimary, fontFamily: typography.bodySmall.fontFamily }]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  historyMode: {
    fontSize: 10,
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: 12,
  },
  trendingWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  trendingText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
