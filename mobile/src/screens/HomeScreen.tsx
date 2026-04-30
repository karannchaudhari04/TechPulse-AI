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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'foryou' | 'saved'>('foryou');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [headerHeight, setHeaderHeight] = useState(130);
  const [streak, setStreak] = useState(2); // Simulated streak for UI demo

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
          {/* Top Bar: Profile | Streak | Logo | Search/Action */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
                <Pressable onPress={() => navigation.navigate('Profile')} style={styles.iconBtn}>
                   <Text style={styles.topIcon}>≡</Text>
                </Pressable>
                <View style={styles.streakBadge}>
                   <Text style={styles.streakEmoji}>⚡</Text>
                   <Text style={styles.streakText}>{streak}</Text>
                </View>
            </View>

            <View style={styles.topBarCenter}>
                <Image 
                    source={require('../../assets/logo_horizontal.png')}
                    style={styles.headerLogo}
                    contentFit="contain"
                />
            </View>

            <View style={styles.topBarRight}>
                <Pressable style={styles.iconBtn}>
                   <Text style={styles.topIcon}>+</Text>
                </Pressable>
            </View>
          </View>

          {/* Premium Centered Tabs */}
          <View style={styles.tabWrapper}>
              <View style={styles.tabList}>
                <TabButton label="My Digest" active={activeTab === 'foryou'} onPress={() => setActiveTab('foryou')} />
                <TabButton label="Topics" active={activeTab === 'all'} onPress={() => setActiveTab('all')} />
                <TabButton label="Bookmarks" active={activeTab === 'saved'} onPress={() => setActiveTab('saved')} />
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
  header: { paddingBottom: 8, backgroundColor: '#020617' },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12 
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  topBarCenter: { flex: 2, alignItems: 'center' },
  topBarRight: { flex: 1, alignItems: 'flex-end' },
  headerLogo: { width: 120, height: 32 },
  iconBtn: { padding: 8 },
  topIcon: { color: '#94A3B8', fontSize: 24, fontWeight: '300' },
  streakBadge: { 
    flexDirection: 'row', 
    backgroundColor: '#1E293B', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8
  },
  streakEmoji: { fontSize: 14, marginRight: 4 },
  streakText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  tabWrapper: { alignItems: 'center', marginTop: 12 },
  tabList: { flexDirection: 'row', gap: 32 },
  tabBtn: { paddingBottom: 10, alignItems: 'center' },
  tabLabel: { color: '#475569', fontSize: 14, fontWeight: '600' },
  tabLabelActive: { color: '#FFFFFF' },
  tabIndicator: { width: 20, height: 3, backgroundColor: '#6366F1', borderRadius: 2, marginTop: 4 },
  feed: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60 },
  emptyTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginBottom: 12 },
  emptyText: { color: '#64748B', fontSize: 16, textAlign: 'center', lineHeight: 24, fontWeight: '500' }
});
