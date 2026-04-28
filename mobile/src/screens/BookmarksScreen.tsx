import React, { useCallback } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import BiteCard from '../components/BiteCard';
import { Bite } from '../types';
import { useBookmarks } from '../hooks/useBookmarks';

export default function BookmarksScreen({ navigation }: any) {
  const { bookmarks, isLoading, isBookmarked, toggleBookmark } = useBookmarks();

  const renderItem = useCallback(({ item }: { item: Bite }) => (
    <BiteCard 
      item={item} 
      isBookmarked={isBookmarked(item.id)} 
      onToggleBookmark={toggleBookmark} 
    />
  ), [isBookmarked, toggleBookmark]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        
        {/* PURE NATIVE HEADER */}
        <View style={styles.header}>
          <Pressable 
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Bookmarks</Text>
            <Text style={styles.subtitle}>YOUR SAVED BITES</Text>
          </View>

          <View style={styles.spacer} />
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : bookmarks.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyEmoji}>🔖</Text>
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
          <FlashList
            data={bookmarks}
            renderItem={renderItem}
            estimatedItemSize={400}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  backText: { fontSize: 20, color: '#F1F5F9' },
  titleContainer: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: '#F1F5F9', letterSpacing: -1 },
  subtitle: { color: '#7C3AED', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginTop: -2 },
  spacer: { width: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconContainer: { backgroundColor: '#1E293B', width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#F1F5F9', marginBottom: 8 },
  emptySub: { color: '#94A3B8', textAlign: 'center', lineHeight: 24 },
  exploreBtn: { marginTop: 32, backgroundColor: '#7C3AED', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 },
  exploreText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  pressed: { opacity: 0.7 },
  listContent: { paddingTop: 10, paddingBottom: 40 }
});
