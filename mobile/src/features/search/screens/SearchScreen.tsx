import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../../theme';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import { useNavigation } from '@react-navigation/native';
import { networkTracker } from '../../../utils/network';

import SearchBar from '../components/SearchBar';
import SearchFilterBottomSheet, { FilterState } from '../components/SearchFilterBottomSheet';
import SuggestionList from '../components/SuggestionList';
import SearchResultCard from '../components/SearchResultCard';
import SearchSkeleton from '../components/SearchSkeleton';
import { useSearchAnalytics } from '../hooks/useSearchAnalytics';
import { SearchCacheService } from '../utils/SearchCacheService';
import { 
  useSearchQuery, 
  useLazyGetSearchSuggestionsQuery, 
  useGetTrendingSearchesQuery,
  SearchResultItem,
  SearchHistoryItem
} from '../api/searchApiSlice';
import Icon from '../../../components/common/Icon';
import Button from '../../../components/common/Button';

type SearchState = 'idle' | 'typing' | 'searching' | 'results' | 'empty' | 'offline' | 'error';

/**
 * Purpose: AI-powered Semantic & Keyword Search screen implementing search states,
 * debounce loaders, and cache-fallback.
 */
export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, spacing } = useTheme();
  
  const [isOnline, setIsOnline] = useState(networkTracker.getIsOnline());
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword'>('semantic');
  const [filterVisible, setFilterVisible] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
  const [accumulatedResults, setAccumulatedResults] = useState<SearchResultItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    sort: 'RELEVANT',
    minImportance: 0,
    minCredibility: 0,
    followingOnly: false,
    unreadOnly: false,
    bookmarkedOnly: false,
    categories: [],
  });

  const analytics = useSearchAnalytics();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchStartTimeRef = useRef<number>(0);

  const [triggerSuggestions, { data: suggestions }] = useLazyGetSearchSuggestionsQuery();
  const { data: trendingQueries } = useGetTrendingSearchesQuery();

  const { data: searchResults, isFetching, error, refetch } = useSearchQuery({
    q: query,
    mode: searchMode,
    sort: filters.sort,
    minImportance: filters.minImportance || undefined,
    minCredibility: filters.minCredibility || undefined,
    categories: filters.categories.length > 0 ? filters.categories : undefined,
    cursor: cursor || undefined,
    limit: 10
  }, { skip: searchState !== 'searching' || !query.trim() });

  useEffect(() => {
    const unsubscribe = networkTracker.subscribe((status) => {
      setIsOnline(status);
      if (!status) {
        setSearchMode('keyword');
        setSearchState(prev => prev === 'searching' ? 'offline' : prev);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    SearchCacheService.getRecentSearches().then(setRecentSearches);
    analytics.trackSearchStarted();
  }, []);

  useEffect(() => {
    if (searchResults) {
      const results = searchResults.content;
      if (cursor === null) {
        setAccumulatedResults(results);
      } else {
        setAccumulatedResults(prev => {
          const ids = new Set(prev.map(i => i.id));
          const filtered = results.filter(i => !ids.has(i.id));
          return [...prev, ...filtered];
        });
      }

      if (results.length > 0) {
        SearchCacheService.cacheSearchResults(query, searchMode, results);
      }

      setSearchState(results.length === 0 && cursor === null ? 'empty' : 'results');

      const duration = Date.now() - searchStartTimeRef.current;
      const filterCount = Object.values(filters).filter(Boolean).length;
      analytics.trackQuerySubmitted(query, searchMode, filterCount, results.length, duration, !isOnline);
    }
  }, [searchResults, cursor]);

  useEffect(() => {
    if (error) {
      if (!isOnline) {
        SearchCacheService.getCachedSearchResults(query, searchMode).then(cached => {
          if (cached && cached.length > 0) {
            setAccumulatedResults(cached);
            setSearchState('results');
          } else {
            setSearchState('offline');
          }
        });
      } else {
        setSearchState('error');
      }
    }
  }, [error, isOnline]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setSearchState(text.trim() ? 'typing' : 'idle');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (text.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        triggerSuggestions(text);
      }, 400);
    }
  };

  const handleSearchSubmit = (searchQuery?: string) => {
    const finalQuery = searchQuery !== undefined ? searchQuery : query;
    if (!finalQuery.trim()) return;

    if (searchQuery !== undefined) {
      setQuery(searchQuery);
    }

    setCursor(null);
    setSearchState('searching');
    searchStartTimeRef.current = Date.now();

    const newItem: SearchHistoryItem = {
      query: finalQuery,
      timestamp: new Date().toISOString(),
      searchMode,
      filtersCount: Object.values(filters).filter(Boolean).length,
      resultCount: 0,
    };

    setRecentSearches(prev => {
      const filtered = prev.filter(i => i.query.toLowerCase() !== finalQuery.toLowerCase());
      const updated = [newItem, ...filtered].slice(0, 10);
      SearchCacheService.saveRecentSearches(updated);
      return updated;
    });
  };

  const handleClearHistory = () => {
    setRecentSearches([]);
    SearchCacheService.saveRecentSearches([]);
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    analytics.trackFilterApplied(newFilters);
    if (query.trim()) {
      handleSearchSubmit();
    }
  };

  const loadMore = () => {
    if (searchResults?.hasNext && !isFetching) {
      setCursor(searchResults.nextCursor);
    }
  };

  const handleRefresh = () => {
    setCursor(null);
    refetch();
  };

  return (
    <SafeAreaWrapper>
      <SearchBar
        value={query}
        onChangeText={handleQueryChange}
        onSubmit={() => handleSearchSubmit()}
        onClear={() => {
          setQuery('');
          setSearchState('idle');
          setAccumulatedResults([]);
        }}
        onFilterPress={() => setFilterVisible(true)}
        searchMode={searchMode}
        onModeToggle={() => {
          if (!isOnline && searchMode === 'keyword') return;
          setSearchMode(prev => prev === 'semantic' ? 'keyword' : 'semantic');
        }}
      />

      {!isOnline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.danger, marginHorizontal: spacing.md, marginVertical: spacing.xs }]}>
          <Icon name="cloud-offline" provider="ionicons" size={14} color="#FFF" />
          <Text style={[styles.offlineText, { fontFamily: typography.caption.fontFamily }]}>
            Offline. Semantic search disabled. Keyword caching mode active.
          </Text>
        </View>
      )}

      {searchState === 'idle' && (
        <SuggestionList
          query=""
          recentSearches={recentSearches}
          trendingSearches={trendingQueries}
          onSelectQuery={handleSearchSubmit}
          onClearHistory={handleClearHistory}
        />
      )}

      {searchState === 'typing' && (
        <SuggestionList
          query={query}
          recentSearches={recentSearches}
          autocompleteSuggestions={suggestions}
          onSelectQuery={handleSearchSubmit}
        />
      )}

      {searchState === 'searching' && <SearchSkeleton />}

      {searchState === 'results' && (
        <FlatList
          data={accumulatedResults}
          renderItem={({ item, index }) => (
            <SearchResultCard
              item={item}
              onPress={() => {
                analytics.trackResultOpened(item.id, index);
                navigation.navigate('EventDetail', { id: item.id });
              }}
              onBookmarkToggle={() => analytics.trackBookmarkClicked(item.id)}
            />
          )}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={isFetching && cursor === null} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={isFetching && cursor !== null ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}
        />
      )}

      {searchState === 'empty' && (
        <View style={styles.center}>
          <Icon name="search" provider="feather" size={48} color={colors.textMuted} />
          <Text style={[styles.titleText, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, marginTop: spacing.sm }]}>
            No results found
          </Text>
          <Text style={[styles.descText, { color: colors.textMuted, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xxs }]}>
            We couldn't find any matches for "{query}". Try checking filters or changing tags.
          </Text>
        </View>
      )}

      {searchState === 'offline' && (
        <View style={styles.center}>
          <Icon name="cloud-offline" provider="ionicons" size={48} color={colors.danger} />
          <Text style={[styles.titleText, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, marginTop: spacing.sm }]}>
            Connection offline
          </Text>
          <Text style={[styles.descText, { color: colors.textMuted, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xxs }]}>
            No offline cache matches found for "{query}". Please check your internet connectivity.
          </Text>
        </View>
      )}

      {searchState === 'error' && (
        <View style={styles.center}>
          <Icon name="alert-triangle" provider="feather" size={48} color={colors.danger} />
          <Text style={[styles.titleText, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, marginTop: spacing.sm }]}>
            Search operation failed
          </Text>
          <Text style={[styles.descText, { color: colors.textMuted, fontFamily: typography.bodyMedium.fontFamily, marginTop: spacing.xxs }]}>
            An unexpected error occurred. Please try again.
          </Text>
          <Button
            title="Retry Search"
            onPress={() => handleSearchSubmit()}
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}

      <SearchFilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  descText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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
  loader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
