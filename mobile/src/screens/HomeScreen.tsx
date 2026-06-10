import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, RefreshControl, Pressable, Dimensions, StyleSheet, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../utils/firebase';
import BiteCard from '../components/BiteCard';
import { Bite } from '../types';
import { useBites } from '../hooks/useBites';
import { useBookmarks } from '../hooks/useBookmarks';
import { useViewedBites } from '../hooks/useViewedBites';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user';
import { useTheme } from '../utils/theme';
import { networkTracker } from '../utils/network';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const ALL_CATEGORY_TABS = [
  { id: '1', label: 'DSA & Problem Solving', type: 'category' as const, cid: 1 },
  { id: '2', label: 'Web Development', type: 'category' as const, cid: 2 },
  { id: '3', label: 'Mobile Development', type: 'category' as const, cid: 3 },
  { id: '4', label: 'AI & Machine Learning', type: 'category' as const, cid: 4 },
  { id: '5', label: 'Cloud & DevOps', type: 'category' as const, cid: 5 },
  { id: '6', label: 'System Design & Backend', type: 'category' as const, cid: 6 },
  { id: '7', label: 'Cybersecurity', type: 'category' as const, cid: 7 },
  { id: '8', label: 'Data Science & Analytics', type: 'category' as const, cid: 8 },
  { id: '9', label: 'Product & UI/UX', type: 'category' as const, cid: 9 },
  { id: '10', label: 'Open Source & GitHub', type: 'category' as const, cid: 10 },
  { id: '11', label: 'Career & Placements', type: 'category' as const, cid: 11 },
  { id: '12', label: 'Emerging Tech', type: 'category' as const, cid: 12 },
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [activeTabId, setActiveTabId] = useState('digest');
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [headerHeight, setHeaderHeight] = useState(110);
  const { colors, isAmoled } = useTheme();
  const [isOnline, setIsOnline] = useState(networkTracker.getIsOnline());
  const streakPulse = useSharedValue(1);

  // Listen to network status changes
  useEffect(() => {
    const unsubscribe = networkTracker.subscribe((status) => {
      setIsOnline(status);
    });
    return unsubscribe;
  }, []);

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
      userApi.updateStreak().then((newStreak) => {
        // Optimize: Update streak locally in-memory without making a redundant network fetch
        queryClient.setQueryData(['userProfile'], (oldData: any) => {
          if (!oldData) return oldData;
          return { ...oldData, streakCount: newStreak };
        });
      }).catch((err) => {
        console.error('[Streak] Update failed:', err);
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
  const { markAsViewed, readTodayIds } = useViewedBites();

  const dailyCount = readTodayIds.length;

  // Pulse streak container if daily goal is completed
  useEffect(() => {
    if (dailyCount >= 3) {
      streakPulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      streakPulse.value = 1;
    }
  }, [dailyCount]);

  const streakPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: streakPulse.value }],
      shadowOpacity: interpolate(streakPulse.value, [1, 1.15], [0.2, 0.5]),
      shadowRadius: interpolate(streakPulse.value, [1, 1.15], [8, 16]),
      elevation: interpolate(streakPulse.value, [1, 1.15], [3, 8]),
    };
  });

  // Haptic feedback celebration the moment goal of 3 is reached
  const prevCountRef = useRef(dailyCount);
  useEffect(() => {
    if (prevCountRef.current < 3 && dailyCount >= 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    prevCountRef.current = dailyCount;
  }, [dailyCount]);

  const bitesData = useMemo(() => {
    return data ? data.pages.flatMap(page => page.content) : [];
  }, [data]);

  const activeIndexRef = React.useRef(0);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== undefined) {
        if (index !== activeIndexRef.current) {
          activeIndexRef.current = index;
          // Haptics.impactAsync removed to satisfy scroll vibration removal
        }
        
        // Mark the active item as viewed
        const activeItem = viewableItems[0].item as Bite;
        if (activeItem && activeItem.id) {
          markAsViewed(activeItem.id);
        }
      }
    }
  }, [markAsViewed]);

  const viewabilityConfig = React.useMemo(() => ({
    itemVisiblePercentThreshold: 80
  }), []);

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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        
        {/* Offline Mode Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={14} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.offlineBannerText}>Reading Offline Mode (Viewing Cached Bites)</Text>
          </View>
        )}

        {/* Sticky Header */}
        <View 
          onLayout={(e) => setHeaderHeight(Math.round(e.nativeEvent.layout.height))}
          style={[styles.header, { backgroundColor: colors.background }]}
        >
          {/* Top Bar (Simplified, No Logo) */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
                <Pressable onPress={() => navigation.navigate('Profile')} style={styles.profileCircle}>
                   {user?.photoURL ? (
                     <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
                   ) : (
                     <Ionicons name="person" size={18} color="#94A3B8" />
                   )}
                </Pressable>
                <Animated.View style={[styles.streakContainer, streakPulseStyle]}>
                   <Image 
                     source={require('../../assets/fire.png')} 
                     style={{ width: 18, height: 18, marginRight: 4 }} 
                     resizeMode="contain"
                   />
                   <Text style={styles.streakText}>{streak}</Text>
                </Animated.View>
            </View>

            <View style={styles.topBarRight}>
                <Pressable onPress={() => navigation.navigate('Personalization')} style={styles.addBtn}>
                   <Image 
                     source={require('../../assets/add.png')} 
                     style={styles.addIcon}
                     resizeMode="contain"
                   />
                </Pressable>
            </View>
          </View>

          {/* Daily Goal Streak Progress Bar */}
          <View style={[styles.dailyGoalContainer, { borderBottomColor: colors.border }]}>
            <View style={styles.dailyGoalTextRow}>
              <Text style={styles.dailyGoalLabel}>
                {dailyCount >= 3 
                  ? "🔥 Streak Locked! Daily goal reached." 
                  : `Read ${3 - dailyCount} more bite${3 - dailyCount > 1 ? 's' : ''} today to lock your streak`}
              </Text>
              <Text style={styles.dailyGoalProgressText}>{dailyCount}/3</Text>
            </View>
            <View style={[styles.dailyProgressBarBg, { backgroundColor: isAmoled ? '#111' : 'rgba(255,255,255,0.08)' }]}>
              <LinearGradient
                colors={dailyCount >= 3 ? ['#10B981', '#059669'] : ['#818CF8', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.dailyProgressBarFill, { width: `${Math.min((dailyCount / 3) * 100, 100)}%` }]}
              />
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
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const TabButton = ({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) => {
  const { colors, isAmoled } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.tabBtn}>
      <Text style={[
        styles.tabLabel, 
        active && styles.tabLabelActive,
        active && { color: isAmoled ? '#FFF' : '#F8FAFC' }
      ]}>{label}</Text>
      {active && <View style={[styles.tabIndicator, { backgroundColor: isAmoled ? '#8B5CF6' : '#00A3FF' }]} />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  safeArea: { flex: 1 },
  header: { paddingBottom: scale(4), backgroundColor: '#0F172A' },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: scale(22), 
    paddingTop: scale(16),
    paddingBottom: scale(8)
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: scale(10) },
  topBarCenter: { flex: 2, alignItems: 'center' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  profileCircle: { 
    width: scale(38), 
    height: scale(38), 
    borderRadius: scale(19), 
    backgroundColor: '#1E293B', 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  profileImage: {
    width: '100%',
    height: '100%'
  },
  iconCircle: { width: scale(38), height: scale(38), borderRadius: scale(19), backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  addBtn: { 
    width: scale(38), 
    height: scale(38), 
    borderRadius: scale(19), 
    backgroundColor: '#6366F1', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  addIcon: { width: scale(22), height: scale(22) },
  streakContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(245, 158, 11, 0.15)', 
    paddingHorizontal: scale(12), 
    paddingVertical: scale(6), 
    borderRadius: scale(100), 
    alignItems: 'center', 
    gap: scale(6),
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  streakText: { color: '#FBBF24', fontWeight: '900', fontSize: scale(15), letterSpacing: -0.5 },
  tabWrapper: { marginTop: scale(4) },
  tabScroll: { paddingHorizontal: scale(20), gap: scale(24), paddingBottom: scale(10) },
  tabBtn: { paddingBottom: scale(8), alignItems: 'center', minWidth: scale(40) },
  tabLabel: { color: '#64748B', fontSize: scale(16), fontWeight: '600' },
  tabLabelActive: { color: '#F8FAFC', fontWeight: '800' },
  tabIndicator: { position: 'absolute', bottom: 0, width: '100%', height: scale(3), backgroundColor: '#00A3FF', borderRadius: scale(2) },
  feed: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: scale(60) },
  emptyTitle: { color: '#FFFFFF', fontSize: scale(22), fontWeight: '800', marginBottom: scale(12) },
  emptyText: { color: '#94A3B8', fontSize: scale(16), textAlign: 'center', lineHeight: scale(24), fontWeight: '500' },
  dailyGoalContainer: {
    paddingHorizontal: scale(22),
    paddingBottom: scale(10),
    borderBottomWidth: 1,
  },
  dailyGoalTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  dailyGoalLabel: {
    color: '#94A3B8',
    fontSize: scale(12),
    fontWeight: '700',
  },
  dailyGoalProgressText: {
    color: '#FFF',
    fontSize: scale(12),
    fontWeight: '800',
  },
  dailyProgressBarBg: {
    height: scale(6),
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  dailyProgressBarFill: {
    height: '100%',
    borderRadius: scale(3),
  },
  offlineBanner: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(6),
    width: '100%',
  },
  offlineBannerText: {
    color: '#FFF',
    fontSize: scale(12),
    fontWeight: '700',
  },
});
