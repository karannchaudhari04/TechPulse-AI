import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, RefreshControl, Pressable, Dimensions, StyleSheet, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../utils/firebase';
import BiteCard from '../components/BiteCard';
import { Bite } from '../types';
import { useBites } from '../hooks/useBites';
import { useBookmarks } from '../hooks/useBookmarks';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const ALL_CATEGORY_TABS = [
  { id: '2', label: 'Artificial Intelligence', type: 'category' as const, cid: 2 },
  { id: '3', label: 'Web Development', type: 'category' as const, cid: 3 },
  { id: '1', label: 'Data Structures', type: 'category' as const, cid: 1 },
  { id: '6', label: 'System Design', type: 'category' as const, cid: 6 },
  { id: '5', label: 'Cybersecurity', type: 'category' as const, cid: 5 },
  { id: '8', label: 'Career Tips', type: 'category' as const, cid: 8 },
  { id: '4', label: 'Hardware & Chips', type: 'category' as const, cid: 4 },
  { id: '7', label: 'Open Source', type: 'category' as const, cid: 7 },
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [activeTabId, setActiveTabId] = useState('digest');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [headerHeight, setHeaderHeight] = useState(110);

  // Fetch user's selected category names
  const { data: userPrefs } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: () => userApi.getPreferences(),
    enabled: !!user
  });

  // Build the dynamic tab list
  const dynamicTabs = useMemo(() => {
    const base = [
      { id: 'digest', label: 'Digest', type: 'all' as const }
    ];
    if (!userPrefs) return base;

    const matchedTabs = ALL_CATEGORY_TABS.filter(tab => 
      userPrefs.some(pref => pref.toLowerCase() === tab.label.toLowerCase())
    );

    return [...base, ...matchedTabs];
  }, [userPrefs]);

  const queryClient = useQueryClient();

  // Fetch user profile for real-time streak
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userApi.getProfile(),
    enabled: !!user
  });

  const streak = profile?.streakCount || 0;

  useEffect(() => {
    // Update streak on mount if user is logged in
    if (user) {
      userApi.updateStreak().then(() => {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      });
    }
  }, [user]);

  const activeTab = dynamicTabs.find(t => t.id === activeTabId) || dynamicTabs[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);
  
  const { 
    data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching 
  } = useBites(activeTab.type, (activeTab as any).cid);
  
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();

  const bitesData = useMemo(() => {
    return data ? data.pages.flatMap(page => page.content) : [];
  }, [data]);

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
          {/* Top Bar with Branding */}
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
                <View style={styles.avatarMiniWrap}>
                    {user?.photoURL ? (
                      <Image source={{ uri: user.photoURL }} style={styles.avatarMini} />
                    ) : (
                      <Text style={styles.avatarInitial}>{user?.displayName?.charAt(0) || 'K'}</Text>
                    )}
                </View>
            </Pressable>

            <View style={styles.brandingCenter}>
               <Image source={require('../../assets/app_icon.png')} style={styles.miniLogo} />
               <Text style={styles.brandingText}>TechBite</Text>
            </View>

            <View style={styles.streakBadge}>
                <MaterialCommunityIcons name="fire" size={16} color="#FB923C" />
                <Text style={styles.streakCount}>{streak}</Text>
            </View>
          </View>
                <Pressable onPress={() => navigation.navigate('Personalization')} style={styles.addBtn}>
                   <Image 
                     source={require('../../assets/add.png')} 
                     style={styles.addIcon}
                     resizeMode="contain"
                   />
                </Pressable>
            </View>
          </View>

          {/* Horizontal Scrollable Tabs */}
          <View style={styles.tabWrapper}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.tabScroll}
              >
                {dynamicTabs.map((tab) => (
                  <TabButton 
                    key={tab.id}
                    label={tab.label} 
                    active={activeTabId === tab.id} 
                    onPress={() => setActiveTabId(tab.id)} 
                  />
                ))}
              </ScrollView>
          </View>
        </View>
        
        {/* Feed Area */}
        <View style={styles.feed}>
          {isLoading && bitesData.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color="#6366F1" size="large" />
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
              onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
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
  root: { flex: 1, backgroundColor: '#0F172A' },
  safeArea: { flex: 1 },
  header: { paddingBottom: 4, backgroundColor: '#0F172A' },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 16,
    paddingBottom: 12
  },
  profileBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#0F172A', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  avatarMiniWrap: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', backgroundColor: '#1E293B' },
  avatarMini: { width: '100%', height: '100%', borderRadius: 17 },
  avatarInitial: { color: '#94A3B8', fontSize: 14, fontWeight: '800' },

  brandingCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniLogo: { width: 28, height: 28, borderRadius: 6 },
  brandingText: { fontSize: 18, fontWeight: '900', color: '#F1F5F9', letterSpacing: -0.5 },

  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  streakCount: { color: '#FB923C', fontSize: 14, fontWeight: '900' },

  addBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    backgroundColor: '#6366F1', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  addIcon: { width: 22, height: 22 },
  tabWrapper: { marginTop: 4 },
  tabScroll: { paddingHorizontal: 20, gap: 24, paddingBottom: 10 },
  tabBtn: { paddingBottom: 8, alignItems: 'center', minWidth: 40 },
  tabLabel: { color: '#64748B', fontSize: 16, fontWeight: '600' },
  tabLabelActive: { color: '#F8FAFC', fontWeight: '800' },
  tabIndicator: { position: 'absolute', bottom: 0, width: '100%', height: 3, backgroundColor: '#00A3FF', borderRadius: 2 },
  feed: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60 },
  emptyTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 12 },
  emptyText: { color: '#94A3B8', fontSize: 16, textAlign: 'center', lineHeight: 24, fontWeight: '500' }
});
