import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, RefreshControl, Pressable, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../utils/firebase';
import BiteCard from '../components/BiteCard';
import { Bite } from '../types';
import { useBites } from '../hooks/useBites';
import { useBookmarks } from '../hooks/useBookmarks';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'all' | 'foryou' | 'saved'>('foryou');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [headerHeight, setHeaderHeight] = useState(130);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);
  
  const { 
    data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching 
  } = useBites(activeTab === 'saved' ? 'all' : activeTab);
  
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();

  const bitesData = useMemo(() => {
    if (activeTab === 'saved') return bookmarks;
    return data ? data.pages.flatMap(page => page.content) : [];
  }, [data, activeTab, bookmarks]);

  const itemHeight = SCREEN_HEIGHT - headerHeight;

  const renderItem = useCallback(({ item }: { item: Bite }) => (
    <View style={{ height: itemHeight, width: SCREEN_WIDTH }}>
      <BiteCard 
        item={item} 
        isBookmarked={isBookmarked(item.id)} 
        onToggleBookmark={toggleBookmark} 
        cardHeight={itemHeight}
      />
    </View>
  ), [isBookmarked, toggleBookmark, itemHeight]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        
        {/* Sticky Header */}
        <View 
          onLayout={(e) => setHeaderHeight(Math.round(e.nativeEvent.layout.height))}
          style={styles.header}
        >
          {/* Brand Row */}
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>
              TechBite<Text style={styles.brandDot}>.</Text>
            </Text>
            
            <Pressable 
              onPress={() => navigation.navigate(user ? 'Profile' : 'Welcome')}
              style={styles.avatarBtn}
            >
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>?</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Premium Tabs */}
          <View style={styles.tabContainer}>
            <View style={styles.tabList}>
              <TabButton label="For You" active={activeTab === 'foryou'} onPress={() => setActiveTab('foryou')} />
              <TabButton label="Discover" active={activeTab === 'all'} onPress={() => setActiveTab('all')} />
              <TabButton label="Saved" active={activeTab === 'saved'} onPress={() => setActiveTab('saved')} />
            </View>
          </View>
        </View>
        
        {/* Feed Area */}
        <View style={styles.feed}>
          {isLoading && bitesData.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color="#6366F1" size="large" />
            </View>
          ) : activeTab === 'saved' && bitesData.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Nothing saved yet.</Text>
              <Text style={styles.emptyText}>Bites you bookmark will appear here.</Text>
            </View>
          ) : (
            <FlashList
              data={bitesData}
              renderItem={renderItem}
              estimatedItemSize={itemHeight}
              pagingEnabled
              snapToInterval={itemHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              onEndReached={() => activeTab !== 'saved' && hasNextPage && !isFetchingNextPage && fetchNextPage()}
              refreshControl={
                <RefreshControl refreshing={isRefetching && !isLoading} onRefresh={refetch} tintColor="#6366F1" />
              }
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const TabButton = ({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) => (
  <Pressable onPress={onPress} style={styles.tabBtn}>
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    {active && <View style={styles.tabIndicator} />}
  </Pressable>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 32, paddingTop: 20, paddingBottom: 16, backgroundColor: '#020617' },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  brandText: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', letterSpacing: -2 },
  brandDot: { color: '#6366F1' },
  avatarBtn: { activeOpacity: 0.8 },
  avatar: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: '#1E293B' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B' },
  avatarInitial: { color: '#64748B', fontWeight: '900' },
  tabContainer: { flexDirection: 'row' },
  tabList: { flexDirection: 'row', gap: 28 },
  tabBtn: { paddingBottom: 10, position: 'relative' },
  tabLabel: { color: '#475569', fontSize: 16, fontWeight: '800', letterSpacing: -0.5 },
  tabLabelActive: { color: '#FFFFFF' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#6366F1', borderRadius: 2 },
  feed: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60 },
  emptyTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginBottom: 12 },
  emptyText: { color: '#64748B', fontSize: 16, textAlign: 'center', lineHeight: 24, fontWeight: '500' }
});
