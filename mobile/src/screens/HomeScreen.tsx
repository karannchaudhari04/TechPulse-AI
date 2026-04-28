import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, RefreshControl, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../utils/firebase';
import BiteCard from '../components/BiteCard';
import { Bite } from '../types';
import { useBites } from '../hooks/useBites';
import { useBookmarks } from '../hooks/useBookmarks';

import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'all' | 'foryou'>('all');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [headerHeight, setHeaderHeight] = useState(160);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);
  
  const { 
    data, 
    isLoading, 
    isError, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch,
    isRefetching
  } = useBites(activeTab);
  
  const bitesData = useMemo(() => {
    return data ? data.pages.flatMap(page => page.content) : [];
  }, [data]);

  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();

  const itemHeight = SCREEN_HEIGHT - headerHeight;

  const renderItem = useCallback(({ item }: { item: Bite }) => (
    <View style={{ height: itemHeight }}>
      <BiteCard 
        item={item} 
        isBookmarked={isBookmarked(item.id)} 
        onToggleBookmark={toggleBookmark} 
        fullScreen={true}
        cardHeight={itemHeight}
      />
    </View>
  ), [isBookmarked, toggleBookmark, itemHeight]);

  const handleTabChange = useCallback((tab: 'all' | 'foryou') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        
        <View 
          onLayout={(e) => setHeaderHeight(Math.round(e.nativeEvent.layout.height))}
          style={styles.header}
        >
          <View style={styles.topRow}>
            <View>
               <Text style={styles.logo}>TechBite<Text style={styles.dot}>.</Text></Text>
               <Text style={styles.subtitle}>ELEVATE YOUR KNOWLEDGE</Text>
            </View>
            
            <View style={styles.actionRow}>
              {user ? (
                <Pressable 
                  onPress={() => navigation.navigate('Profile')}
                  style={({ pressed }) => [styles.profileContainer, pressed && styles.pressed]}
                >
                  {user.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.avatar} contentFit="cover" transition={400} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ) : (
                <Pressable 
                  onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] })}
                  style={({ pressed }) => [styles.signInBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.signInText}>SIGN IN</Text>
                </Pressable>
              )}
              
              <Pressable 
                onPress={() => navigation.navigate('Bookmarks')}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                 <Text style={styles.iconText}>🔖</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.tabContainer}>
              <Pressable 
                onPress={() => handleTabChange('foryou')}
                style={[styles.tab, activeTab === 'foryou' && styles.activeTab]}
              >
                {activeTab === 'foryou' && (
                  <LinearGradient
                    colors={['#7C3AED', '#6D28D9']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                )}
                <Text style={[styles.tabText, activeTab === 'foryou' && styles.activeTabText]}>
                  FOR YOU
                </Text>
              </Pressable>
              
              <Pressable 
                onPress={() => handleTabChange('all')}
                style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              >
                {activeTab === 'all' && (
                  <LinearGradient
                    colors={['#7C3AED', '#6D28D9']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                )}
                <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                  DISCOVER
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        
        <View style={styles.feedContainer}>
          {isLoading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>Fetching your bites...</Text>
            </View>
          )}

          {isError && !isLoading && (
            <View style={styles.center}>
              <Text style={styles.emoji}>📡</Text>
              <Text style={styles.errorTitle}>Connection Issues</Text>
              <Text style={styles.errorSub}>Could not reach the server. Please check your internet.</Text>
              <Pressable onPress={() => refetch()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          )}
          
          {!isLoading && !isError && bitesData.length === 0 && (
            <View style={styles.center}>
              <Text style={styles.emoji}>✨</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'foryou' ? 'No interests selected' : 'All caught up!'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'foryou' 
                  ? 'Set your preferences to see a personalised feed.' 
                  : 'Check back later for more tech updates.'}
              </Text>
              <Pressable 
                onPress={() => activeTab === 'foryou' ? navigation.navigate('Interests') : refetch()} 
                style={styles.refreshBtn}
              >
                <Text style={styles.refreshText}>
                  {activeTab === 'foryou' ? 'Set Preferences' : 'Refresh Feed'}
                </Text>
              </Pressable>
            </View>
          )}
          
          {!isLoading && !isError && bitesData.length > 0 && (
            <FlashList
              data={bitesData}
              extraData={bookmarks}
              renderItem={renderItem}
              estimatedItemSize={itemHeight}
              pagingEnabled={Platform.OS === 'ios'} 
              snapToInterval={itemHeight}
              snapToAlignment="start"
              decelerationRate={0.9} 
              disableIntervalMomentum={true}
              showsVerticalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl 
                  refreshing={isRefetching && !isLoading} 
                  onRefresh={refetch}
                  tintColor="#7C3AED"
                />
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    backgroundColor: '#0F172A',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    zIndex: 10,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logo: { fontSize: 30, fontWeight: '900', color: '#F8FAFC', letterSpacing: -1.8 },
  dot: { color: '#7C3AED' },
  subtitle: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginTop: -4 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  profileContainer: { marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 14, borderWidth: 1.5, borderColor: '#334155' },
  avatarPlaceholder: { 
    width: 40, height: 40, borderRadius: 14, 
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#6D28D9'
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  signInBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 12,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  iconButton: { 
    width: 40, height: 40, 
    backgroundColor: '#1E293B', borderRadius: 14, 
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155' 
  },
  iconText: { fontSize: 18 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  bottomRow: { alignItems: 'center' },
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#1E293B', 
    padding: 4, 
    borderRadius: 18,
    width: '100%',
  },
  tab: { 
    flex: 1,
    paddingVertical: 12, 
    borderRadius: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  activeTab: { backgroundColor: '#7C3AED' },
  tabText: { fontSize: 11, fontWeight: '900', color: '#64748B', letterSpacing: 1.5 },
  activeTabText: { color: '#FFFFFF' },
  feedContainer: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { color: '#64748B', marginTop: 12, fontWeight: '600', fontSize: 14 },
  errorTitle: { fontSize: 20, fontWeight: '900', color: '#F8FAFC', marginBottom: 8 },
  errorSub: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 24 },
  retryBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20 },
  retryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  emoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#F8FAFC', marginBottom: 8 },
  emptySub: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 24 },
  refreshBtn: { 
    borderWidth: 1.5, borderColor: '#7C3AED', 
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 18 
  },
  refreshText: { color: '#7C3AED', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }
});
