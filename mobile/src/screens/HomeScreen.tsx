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
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import SkeletonCard from '../components/SkeletonCard';
import { NotificationService } from '../utils/NotificationService';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as any;

const ScrollAnimatedItem = ({
  scrollY,
  index,
  itemHeight,
  children,
}: {
  scrollY: Animated.SharedValue<number>;
  index: number;
  itemHeight: number;
  children: React.ReactNode;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const cardPosition = index * itemHeight;
    const offset = scrollY.value - cardPosition;

    const scale = interpolate(
      offset,
      [-itemHeight, 0, itemHeight],
      [0.94, 1.0, 0.94],
      'clamp'
    );

    const opacity = interpolate(
      offset,
      [-itemHeight, 0, itemHeight],
      [0.6, 1.0, 0.6],
      'clamp'
    );

    const translateY = interpolate(
      offset,
      [-itemHeight, 0, itemHeight],
      [15, 0, -15],
      'clamp'
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  return (
    <Animated.View style={[{ height: itemHeight, width: SCREEN_WIDTH }, animatedStyle]}>
      {children}
    </Animated.View>
  );
};


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
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });


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

  const activeTab = dynamicTabs.find(t => t.id === activeTabId) || dynamicTabs[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // Register push token when user is logged in
  useEffect(() => {
    if (user) {
      NotificationService.requestPermissions().then((token) => {
        if (token) {
          userApi.registerPushToken(token)
            .then(() => console.info('[Push] Token registered successfully.'))
            .catch((err) => console.error('[Push] Failed to register token on server:', err));
        }
      });
    }
  }, [user]);
  
  const { 
    data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching 
  } = useBites(activeTab.type, (activeTab as any).cid);
  
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();
  const { markAsViewed } = useViewedBites();

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

  const renderItem = useCallback(({ item, index }: { item: Bite; index: number }) => (
    <ScrollAnimatedItem scrollY={scrollY} index={index} itemHeight={itemHeight}>
      <BiteCard 
        item={item} 
        isBookmarked={isBookmarked(item.id)} 
        onToggleBookmark={toggleBookmark} 
        cardHeight={itemHeight}
      />
    </ScrollAnimatedItem>
  ), [isBookmarked, toggleBookmark, itemHeight, scrollY]);

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
            <ScrollView 
              showsVerticalScrollIndicator={false}
              pagingEnabled
              decelerationRate="fast"
              snapToInterval={itemHeight}
            >
              {[1, 2, 3].map((key) => (
                <SkeletonCard key={key} cardHeight={itemHeight} />
              ))}
            </ScrollView>
          ) : (
            <AnimatedFlashList
              data={bitesData}
              renderItem={renderItem}
              estimatedItemSize={itemHeight}
              pagingEnabled
              snapToInterval={itemHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              keyExtractor={(item: Bite) => item.id.toString()}
              onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
              refreshControl={
                <RefreshControl refreshing={isRefetching && !isLoading} onRefresh={refetch} tintColor="#6366F1" />
              }
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
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
