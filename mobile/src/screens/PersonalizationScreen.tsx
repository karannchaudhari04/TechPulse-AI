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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sample data to match the screenshot's aesthetic
// Real categories from the backend pillars
const ALL_TOPICS = [
  { id: '2', name: 'Artificial Intelligence', followers: '84.3K', emoji: '🤖' },
  { id: '3', name: 'Web Development', followers: '43.6K', emoji: '✨' },
  { id: '1', name: 'Data Structures', followers: '44.6K', emoji: '📊' },
  { id: '6', name: 'System Design', followers: '29.1K', emoji: '🏗️' },
  { id: '5', name: 'Cybersecurity', followers: '12.5K', emoji: '🛡️' },
  { id: '4', name: 'Hardware & Chips', followers: '38.4K', emoji: '🔌' },
  { id: '7', name: 'Open Source', followers: '21.8K', emoji: '🌍' },
  { id: '8', name: 'Career Tips', followers: '55.2K', emoji: '📈' },
];

interface PersonalizationScreenProps {
  onClose: () => void;
}

export default function PersonalizationScreen({ onClose }: PersonalizationScreenProps) {
  const queryClient = useQueryClient();
  
  // Fetch current preferences
  const { data: userPrefs, isLoading } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: () => userApi.getPreferences()
  });

  // Toggle interest mutation
  const toggleMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const current = userPrefs || [];
      const updated = current.includes(categoryName)
        ? current.filter(c => c !== categoryName)
        : [...current, categoryName];
      return userApi.savePreferences(updated);
    },
    onSuccess: () => {
      // Invalidate both preferences and home feed tabs
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
    }
  });

  const renderTopic = ({ item }: { item: typeof ALL_TOPICS[0] }) => {
    // Exact match logic for real backend sync
    const isFollowing = userPrefs?.some(p => p === item.name);

    return (
      <View style={styles.topicItem}>
        <View style={styles.topicInfo}>
          <Text style={styles.topicName}>{item.name} {item.emoji}</Text>
          <Text style={styles.topicFollowers}>{item.followers} Followers</Text>
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
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
        </View>

        <FlatList
          data={ALL_TOPICS}
          renderItem={renderTopic}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={() => (
            <View>
              {/* Alerts Card Only */}
              <Pressable style={styles.settingCard}>
                <View style={styles.cardIconBox}>
                  <Ionicons name="notifications-outline" size={24} color="#94A3B8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Alerts</Text>
                  <Text style={styles.cardSubtitle}>Smart notifications enabled</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#475569" />
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
    paddingHorizontal: 20, 
    paddingVertical: 15 
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  closeBtn: { padding: 4 },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  settingCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#111111', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#222'
  },
  cardIconBox: { width: 44, height: 44, backgroundColor: '#1A1A1A', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardText: { flex: 1 },
  cardTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  cardSubtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  
  sectionTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 25, marginBottom: 20 },
  
  topicItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 18, 
    borderBottomWidth: 1, 
    borderBottomColor: '#111' 
  },
  topicInfo: { flex: 1 },
  topicName: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  topicFollowers: { color: '#64748B', fontSize: 13, marginTop: 4 },
  
  followBtn: { 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 20,
    minWidth: 95,
    alignItems: 'center'
  },
  followingBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155'
  },
  followBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },
  followingBtnText: { color: '#FFF' }
});
