import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  FlatList, 
  Dimensions, 
  Image, 
  StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user';
import { useTheme } from '../utils/theme';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

// Sample data to match the screenshot's aesthetic
const TOPIC_METADATA: Record<string, { label: string, emoji: string }> = {
  'DSA & Problem Solving': { label: 'DSA & Problem Solving', emoji: '🧠' },
  'Web Development': { label: 'Web Development', emoji: '💻' },
  'Mobile Development': { label: 'Mobile Development', emoji: '📱' },
  'AI & Machine Learning': { label: 'AI & Machine Learning', emoji: '🤖' },
  'Cloud & DevOps': { label: 'Cloud & DevOps', emoji: '☁️' },
  'System Design & Backend': { label: 'System Design & Backend', emoji: '🏗️' },
  'Cybersecurity': { label: 'Cybersecurity', emoji: '🛡️' },
  'Data Science & Analytics': { label: 'Data Science & Analytics', emoji: '📊' },
  'Product & UI/UX': { label: 'Product & UI/UX', emoji: '🎨' },
  'Open Source & GitHub': { label: 'Open Source & GitHub', emoji: '🌍' },
  'Career & Placements': { label: 'Career & Placements', emoji: '💼' },
  'Emerging Tech': { label: 'Emerging Tech', emoji: '🚀' }
};

interface PersonalizationScreenProps {
  onClose: () => void;
}

export default function PersonalizationScreen({ onClose }: PersonalizationScreenProps) {
  const queryClient = useQueryClient();
  const { isAmoled, setAmoled } = useTheme();
  
  // 1. Fetch real categories from backend
  const { data: allCategories, isLoading: loadingCats } = useQuery({
    queryKey: ['allCategories'],
    queryFn: () => userApi.getCategories()
  });

  // 2. Fetch current user preferences
  const { data: userPrefs, isLoading: loadingPrefs } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: () => userApi.getPreferences()
  });

  // Toggle interest mutation with instant Optimistic Updates!
  const toggleMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const current = userPrefs || [];
      const updated = current.includes(categoryName)
        ? current.filter(c => c !== categoryName)
        : [...current, categoryName];
      return userApi.savePreferences(updated);
    },
    onMutate: async (categoryName) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['userPreferences'] });

      // Snapshot the previous state
      const previousPrefs = queryClient.getQueryData<string[]>(['userPreferences']) || [];

      // Optimistically update to the new value instantly
      const updatedPrefs = previousPrefs.includes(categoryName)
        ? previousPrefs.filter(c => c !== categoryName)
        : [...previousPrefs, categoryName];
        
      queryClient.setQueryData(['userPreferences'], updatedPrefs);

      // Return context with previous value for rollback
      return { previousPrefs };
    },
    onError: (err, categoryName, context) => {
      // Rollback to the snapshot if mutation fails
      if (context?.previousPrefs) {
        queryClient.setQueryData(['userPreferences'], context.previousPrefs);
      }
    },
    onSuccess: () => {
      // Quietly invalidate in background to ensure sync
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
      queryClient.invalidateQueries({ queryKey: ['allCategories'] });
    }
  });

  const renderTopic = ({ item }: { item: any }) => {
    const isFollowing = userPrefs?.some(p => p === item.name);
    const metadata = TOPIC_METADATA[item.name] || { label: item.name, emoji: '🚀' };
    
    // Format follower count (e.g. 1500 -> 1.5K)
    const formatFollowers = (count: number) => {
      if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
      return count.toString();
    };

    return (
      <View style={styles.topicItem}>
        <View style={styles.topicInfo}>
          <Text style={styles.topicName}>{metadata.label} {metadata.emoji}</Text>
          <Text style={styles.topicFollowers}>{formatFollowers(item.followerCount || 0)} Followers</Text>
        </View>
        <Pressable 
          onPress={() => toggleMutation.mutate(item.name)}
          style={[
            styles.followBtn, 
            isFollowing && styles.followingBtn
          ]}
        >
          <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
            {isFollowing ? 'Following' : '+ Follow'}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Personalization</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Image 
              source={require('../../assets/cross.png')} 
              style={styles.crossIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        <FlatList
          data={allCategories}
          renderItem={renderTopic}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={() => (
            <View>
              {/* Alerts Card */}
              <Pressable style={styles.settingCard}>
                <View style={styles.cardIconBox}>
                  <Image 
                    source={require('../../assets/noti.png')} 
                    style={styles.cardIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Alerts</Text>
                  <Text style={styles.cardSubtitle}>Smart notifications enabled</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#475569" />
              </Pressable>

              {/* AMOLED Black Theme Card */}
              <Pressable 
                style={styles.settingCard} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  setAmoled(!isAmoled);
                }}
              >
                <View style={styles.cardIconBox}>
                  <Ionicons name={isAmoled ? "moon" : "sunny"} size={22} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>AMOLED Black Theme</Text>
                  <Text style={styles.cardSubtitle}>{isAmoled ? "Pure black theme active" : "Standard theme active"}</Text>
                </View>
                <Ionicons 
                  name={isAmoled ? "toggle" : "toggle-outline"} 
                  size={32} 
                  color={isAmoled ? "#6366F1" : "#475569"} 
                />
              </Pressable>

              <Text style={styles.sectionTitle}>Topics for you</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: scale(20), 
    paddingTop: scale(20),
    paddingBottom: scale(15) 
  },
  headerTitle: { color: '#FFF', fontSize: scale(20), fontWeight: '800' },
  closeBtn: { padding: scale(4) },
  crossIcon: { width: scale(24), height: scale(24) },
  cardIcon: { width: scale(24), height: scale(24) },
  
  listContent: { paddingHorizontal: scale(20), paddingBottom: scale(40) },
  
  settingCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#111111', 
    borderRadius: scale(16), 
    padding: scale(20), 
    marginBottom: scale(15),
    borderWidth: 1,
    borderColor: '#222'
  },
  cardIconBox: { width: scale(44), height: scale(44), backgroundColor: '#1A1A1A', borderRadius: scale(12), justifyContent: 'center', alignItems: 'center', marginRight: scale(15) },
  cardText: { flex: 1 },
  cardTitle: { color: '#FFF', fontSize: scale(17), fontWeight: '700' },
  cardSubtitle: { color: '#64748B', fontSize: scale(13), marginTop: scale(2) },
  
  sectionTitle: { color: '#FFF', fontSize: scale(22), fontWeight: '800', marginTop: scale(25), marginBottom: scale(20) },
  
  topicItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: scale(18), 
    borderBottomWidth: 1, 
    borderBottomColor: '#111' 
  },
  topicInfo: { flex: 1 },
  topicName: { color: '#FFF', fontSize: scale(18), fontWeight: '700' },
  topicFollowers: { color: '#64748B', fontSize: scale(13), marginTop: scale(4) },
  
  followBtn: { 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: scale(18), 
    paddingVertical: scale(10), 
    borderRadius: scale(20),
    minWidth: scale(95),
    alignItems: 'center'
  },
  followingBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155'
  },
  followBtnText: { color: '#000', fontSize: scale(14), fontWeight: '800' },
  followingBtnText: { color: '#FFF' }
});
