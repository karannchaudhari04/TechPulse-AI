import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  FlatList, 
  Dimensions, 
  Image, 
  StatusBar,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOPIC_METADATA: Record<string, { label: string, emoji: string }> = {
  'Artificial Intelligence': { label: 'AI & Machine Learning', emoji: '🤖' },
  'Web Development': { label: 'Web Development', emoji: '✨' },
  'Data Structures': { label: 'Data Structures', emoji: '📊' },
  'System Design': { label: 'System Design', emoji: '🏗️' },
  'Cybersecurity': { label: 'Cybersecurity', emoji: '🛡️' },
  'Hardware & Chips': { label: 'Hardware & Chips', emoji: '🔌' },
  'Open Source': { label: 'Open Source', emoji: '🌍' },
  'Career Tips': { label: 'Career Tips', emoji: '📈' }
};

interface PersonalizationScreenProps {
  onClose: () => void;
}

export default function PersonalizationScreen({ onClose }: PersonalizationScreenProps) {
  const queryClient = useQueryClient();
  
  const { data: allCategories } = useQuery({
    queryKey: ['allCategories'],
    queryFn: () => userApi.getCategories()
  });

  const { data: userPrefs } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: () => userApi.getPreferences()
  });

  const toggleMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const current = userPrefs || [];
      const updated = current.includes(categoryName)
        ? current.filter(c => c !== categoryName)
        : [...current, categoryName];
      return userApi.savePreferences(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
      queryClient.invalidateQueries({ queryKey: ['allCategories'] });
    }
  });

  const renderTopic = ({ item }: { item: any }) => {
    const isFollowing = userPrefs?.some(p => p === item.name);
    const metadata = TOPIC_METADATA[item.name] || { label: item.name, emoji: '🚀' };
    
    const formatFollowers = (count: number) => {
      if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
      return count.toString();
    };

    return (
      <View style={styles.topicCard}>
        <View style={styles.topicInfo}>
          <Text style={styles.topicLabel}>{metadata.emoji} {metadata.label}</Text>
          <Text style={styles.topicStats}>{formatFollowers(item.followerCount || 0)} members following</Text>
        </View>
        <Pressable 
          onPress={() => toggleMutation.mutate(item.name)}
          style={[
            styles.followBtn, 
            isFollowing && styles.followingBtn
          ]}
        >
           {isFollowing ? (
             <Ionicons name="checkmark" size={18} color="#F1F5F9" />
           ) : (
             <Text style={styles.followBtnText}>+ Follow</Text>
           )}
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
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Interests</Text>
            <Text style={styles.headerSubtitle}>Tune your AI feed</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeIconCircle}>
            <Ionicons name="close" size={24} color="#94A3B8" />
          </Pressable>
        </View>

        <FlatList
          data={allCategories}
          renderItem={renderTopic}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View>
              {/* Promo Alerts Card */}
              <Pressable style={styles.alertCard}>
                <View style={styles.alertIconBox}>
                    <Ionicons name="notifications" size={20} color="#818CF8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Smart Alerts</Text>
                  <Text style={styles.alertDesc}>Get notified for top tech bites</Text>
                </View>
                <View style={styles.activeBadge}>
                    <Text style={styles.activeText}>Active</Text>
                </View>
              </Pressable>

              <Text style={styles.sectionHeader}>Topics for you</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 24,
    paddingBottom: 24 
  },
  headerLeft: { gap: 4 },
  headerTitle: { color: '#F1F5F9', fontSize: 28, fontWeight: '900' },
  headerSubtitle: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  closeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  listContainer: { paddingHorizontal: 24, paddingBottom: 40 },
  
  alertCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#0F172A', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  alertIconBox: { width: 44, height: 44, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  alertTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '800' },
  alertDesc: { color: '#64748B', fontSize: 13, marginTop: 2, fontWeight: '500' },
  activeBadge: { backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  activeText: { color: '#818CF8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  
  sectionHeader: { color: '#F1F5F9', fontSize: 20, fontWeight: '900', marginBottom: 20 },
  
  topicCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#0F172A',
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  topicInfo: { flex: 1, gap: 4 },
  topicLabel: { color: '#F1F5F9', fontSize: 16, fontWeight: '800' },
  topicStats: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  
  followBtn: { 
    backgroundColor: '#F1F5F9', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 14,
    minWidth: 80,
    alignItems: 'center'
  },
  followingBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155'
  },
  followBtnText: { color: '#020617', fontSize: 13, fontWeight: '900' },
});
