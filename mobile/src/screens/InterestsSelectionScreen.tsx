import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  Dimensions, 
  Image, 
  Platform, 
  StatusBar 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const INTERESTS = [
  { id: 'Web Development', label: 'Web Development', emoji: '✨' },
  { id: 'Artificial Intelligence', label: 'AI & Machine Learning', emoji: '🤖' },
  { id: 'Data Structures', label: 'Data Structures', emoji: '📊' },
  { id: 'System Design', label: 'System Design', emoji: '🏗️' },
  { id: 'Cybersecurity', label: 'Cybersecurity', emoji: '🛡️' },
  { id: 'Hardware & Chips', label: 'Hardware & Chips', emoji: '🔌' },
  { id: 'Open Source', label: 'Open Source', emoji: '🌍' },
  { id: 'Career Tips', label: 'Career Tips', emoji: '📈' },
];

const MIN_TAGS = 3;

export default function InterestsSelectionScreen({ onComplete }: { onComplete: (tags: string[]) => void }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const canProceed = selectedTags.length >= MIN_TAGS;

  const toggleTag = (id: string) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  return (
    <View style={styles.root}>
      {/* 1. Header (Updated to 1 of 2) */}
      <View style={styles.header}>
        <Text style={styles.headerLeft}>Personalize your feed</Text>
        <View style={styles.headerRight}>
        </View>
      </View>

      {/* 2. Main Selection Card */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={StyleSheet.absoluteFillObject}
          />
          
          <View style={styles.cardContent}>
            
            {/* Title & Bot Section */}
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Let's initialize your feed.</Text>
                <Text style={styles.subtitle}>Pick any {MIN_TAGS} interests.</Text>
                <Text style={canProceed ? styles.countReady : styles.countPending}>
                  {selectedTags.length}/{MIN_TAGS} Selected
                </Text>
              </View>
              <View style={styles.botBox}>
                <Image source={require('../../assets/techbot.png')} style={styles.bot} resizeMode="contain" />
              </View>
            </View>

            {/* Scrollable Tags Grid */}
            <View style={styles.tagArea}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
                {INTERESTS.map(tag => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <Pressable 
                      key={tag.id} 
                      onPress={() => toggleTag(tag.id)}
                      style={[styles.tag, isSelected && styles.tagActive]}
                    >
                      <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
                        {tag.label} {tag.emoji}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Structural Clean Footer */}
            <View style={styles.buttonRow}>
               <Pressable 
                 onPress={() => canProceed && onComplete(selectedTags)}
                 style={[styles.nextBtn, canProceed ? styles.nextBtnActive : styles.nextBtnDisabled]}
               >
                 <Text style={styles.nextBtnText}>Finish & Start Reading</Text>
                 <Ionicons 
                    name="checkmark-done" 
                    size={22} 
                    color="#FFF" 
                 />
               </Pressable>
            </View>

          </View>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617', paddingTop: Platform.OS === 'android' ? 40 : 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginBottom: 15 },
  headerLeft: { color: '#64748B', fontSize: 16, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  cardContainer: { paddingHorizontal: 16, height: SCREEN_HEIGHT * 0.92 },
  card: { flex: 1, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: '#27272A' },
  cardContent: { flex: 1, padding: 24 },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: '#94A3B8', fontSize: 15, marginTop: 4 },
  countPending: { color: '#FACC15', fontWeight: '800', marginTop: 8 },
  countReady: { color: '#4ADE80', fontWeight: '800', marginTop: 8 },
  botBox: { width: 64, height: 64, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bot: { width: 48, height: 48 },

  tagArea: { flex: 1, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 10 },
  tag: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 100, backgroundColor: '#0F172A', borderWidth: 1.2, borderColor: '#1E293B' },
  tagActive: { backgroundColor: '#818CF8', borderColor: '#A5B4FC' },
  tagText: { color: '#E2E8F0', fontSize: 15, fontWeight: '600' },
  tagTextActive: { color: '#FFF' },

  buttonRow: { height: 80, justifyContent: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', marginTop: 10 },
  nextBtn: { 
    flex: 1, 
    height: 64, 
    borderRadius: 18, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 4
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  nextBtnActive: { backgroundColor: '#334155', borderColor: 'rgba(255,255,255,0.1)' },
  nextBtnDisabled: { opacity: 0.5 },

  bottomSpacer: { height: SCREEN_HEIGHT * 0.03 }
});
