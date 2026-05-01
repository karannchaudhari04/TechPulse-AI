import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import BiteCard from '../components/BiteCard';
import { Bite } from '../types';
import { useBookmarks } from '../hooks/useBookmarks';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BookmarksScreen({ navigation }: any) {
  const { bookmarks, isLoading, isBookmarked, toggleBookmark } = useBookmarks();
  const [headerHeight, setHeaderHeight] = useState(100);

  const itemHeight = SCREEN_HEIGHT - headerHeight;

  const renderItem = useCallback(({ item }: { item: Bite }) => (
    <View style={{ height: itemHeight, width: SCREEN_WIDTH }}>
      <BiteCard 
        item={item} 
        isBookmarked={isBookmarked(item.id)} 
        onToggleBookmark={toggleBookmark} 
        fullScreen={true}
        cardHeight={itemHeight}
      />
    </View>
  ), [isBookmarked, toggleBookmark, itemHeight]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        
        <View 
          onLayout={(e) => setHeaderHeight(Math.round(e.nativeEvent.layout.height))}
          style={styles.header}
        >
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#F1F5F9" />
          </Pressable>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Bookmarks</Text>
            <Text style={styles.subtitle}>YOUR SAVED BITES</Text>
          </View>

          <View style={styles.iconBtnPlaceholder} />
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : bookmarks.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconContainer}>
               <Image 
                 source={require('../../assets/savebite.png')} 
                 style={{ width: 60, height: 60 }} 
                 contentFit="contain"
               />
            </View>
            <Text style={styles.emptyTitle}>Empty Library</Text>
            <Text style={styles.emptySub}>
              Bookmark interesting tech tips to see them here later!
            </Text>
            
            <Pressable 
              onPress={() => navigation.navigate('Home')}
              style={({ pressed }) => [styles.exploreBtn, pressed && styles.pressed]}
            >
              <Text style={styles.exploreText}>EXPLORE FEED</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlashList
              data={bookmarks}
              renderItem={renderItem}
              estimatedItemSize={itemHeight}
              pagingEnabled={true}
              snapToInterval={itemHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum={true}
              showsVerticalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconBtnPlaceholder: { width: 40 },
  titleContainer: { alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: '#F1F5F9', letterSpacing: -0.5 },
  subtitle: { color: '#7C3AED', fontSize: 9, fontWeight: 'bold', letterSpacing: 2, marginTop: -2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconContainer: { 
    backgroundColor: '#1E293B', width: 120, height: 120, borderRadius: 60, 
    alignItems: 'center', justifyContent: 'center', marginBottom: 24, 
    borderWidth: 1, borderColor: '#334155',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 15, elevation: 5
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#F1F5F9', marginBottom: 8 },
  emptySub: { color: '#94A3B8', textAlign: 'center', lineHeight: 24, fontWeight: '500' },
  exploreBtn: { marginTop: 32, backgroundColor: '#7C3AED', paddingHorizontal: 32, paddingVertical: 18, borderRadius: 24 },
  exploreText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  pressed: { opacity: 0.7 }
});
