import React, { useState, useMemo, useEffect } from 'react';
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
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

const INTERESTS = [
  { id: 'DSA & Problem Solving', label: 'DSA & Problem Solving', emoji: '🧠' },
  { id: 'Web Development', label: 'Web Development', emoji: '💻' },
  { id: 'Mobile Development', label: 'Mobile Development', emoji: '📱' },
  { id: 'AI & Machine Learning', label: 'AI & Machine Learning', emoji: '🤖' },
  { id: 'Cloud & DevOps', label: 'Cloud & DevOps', emoji: '☁️' },
  { id: 'System Design & Backend', label: 'System Design & Backend', emoji: '🏗️' },
  { id: 'Cybersecurity', label: 'Cybersecurity', emoji: '🛡️' },
  { id: 'Data Science & Analytics', label: 'Data Science & Analytics', emoji: '📊' },
  { id: 'Product & UI/UX', label: 'Product & UI/UX', emoji: '🎨' },
  { id: 'Open Source & GitHub', label: 'Open Source & GitHub', emoji: '🌍' },
  { id: 'Career & Placements', label: 'Career & Placements', emoji: '💼' },
  { id: 'Emerging Tech', label: 'Emerging Tech', emoji: '🚀' },
];

const MIN_TAGS = 3;

function TagPill({ tag, isSelected, onPress }: { tag: any; isSelected: boolean; onPress: () => void }) {
  const scaleVal = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    scaleVal.value = withSpring(isSelected ? 1.05 : 1, { damping: 10, stiffness: 100 });
    glow.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleVal.value }],
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: glow.value * 4 },
      shadowOpacity: glow.value * 0.35,
      shadowRadius: glow.value * 8,
      elevation: glow.value * 5,
      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.25)' : '#0F172A',
      borderColor: isSelected ? '#818CF8' : '#1E293B',
    };
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.tag, animatedStyle]}>
        <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
          {tag.label} {tag.emoji}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

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
                <Image source={require('../../assets/techbot.jpg')} style={styles.bot} resizeMode="contain" />
              </View>
            </View>

            {/* Scrollable Tags Grid */}
            <View style={styles.tagArea}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
                {INTERESTS.map(tag => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <TagPill 
                      key={tag.id}
                      tag={tag}
                      isSelected={isSelected}
                      onPress={() => toggleTag(tag.id)}
                    />
                  );
                })}
              </ScrollView>
            </View>

            {/* Structural Clean Footer */}
            <View style={styles.buttonRow}>
               <Pressable 
                 onPress={() => canProceed && onComplete(selectedTags)}
                 disabled={!canProceed}
                 style={({ pressed }) => [
                   styles.nextBtnWrapper,
                   !canProceed && styles.nextBtnDisabled,
                   pressed && canProceed && styles.btnPressed
                 ]}
               >
                 <LinearGradient
                   colors={canProceed ? ['#6366F1', '#4F46E5'] : ['#1E293B', '#1E293B']}
                   start={{ x: 0, y: 0 }}
                   end={{ x: 1, y: 0 }}
                   style={styles.nextBtn}
                 >
                   <Text style={styles.nextBtnText}>Finish & Start Reading</Text>
                   <Ionicons 
                      name="checkmark-done" 
                      size={22} 
                      color="#FFF" 
                   />
                 </LinearGradient>
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
  root: { flex: 1, backgroundColor: '#020617', paddingTop: Platform.OS === 'android' ? scale(40) : scale(20) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(25), marginBottom: scale(15) },
  headerLeft: { color: '#64748B', fontSize: scale(16), fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  progressText: { color: '#FFF', fontSize: scale(16), fontWeight: '700' },

  cardContainer: { paddingHorizontal: scale(16), height: SCREEN_HEIGHT * 0.92 },
  card: { flex: 1, borderRadius: scale(32), overflow: 'hidden', borderWidth: 1, borderColor: '#27272A' },
  cardContent: { flex: 1, padding: scale(24) },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(20) },
  title: { color: '#FFF', fontSize: scale(24), fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: '#94A3B8', fontSize: scale(15), marginTop: scale(4) },
  countPending: { color: '#FACC15', fontWeight: '800', marginTop: scale(8) },
  countReady: { color: '#4ADE80', fontWeight: '800', marginTop: scale(8) },
  botBox: { width: scale(64), height: scale(64), backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: scale(14), justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bot: { width: scale(48), height: scale(48) },

  tagArea: { flex: 1, marginBottom: scale(10) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), paddingBottom: scale(10) },
  tag: { paddingHorizontal: scale(16), paddingVertical: scale(12), borderRadius: scale(100), backgroundColor: '#0F172A', borderWidth: 1.2, borderColor: '#1E293B' },
  tagActive: { backgroundColor: '#818CF8', borderColor: '#A5B4FC' },
  tagText: { color: '#E2E8F0', fontSize: scale(15), fontWeight: '600' },
  tagTextActive: { color: '#FFF' },

  buttonRow: { height: scale(80), justifyContent: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', marginTop: scale(10) },
  nextBtnWrapper: { 
    flex: 1, 
    height: scale(56), 
    borderRadius: scale(28), 
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtn: { 
    flex: 1, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    gap: scale(12),
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: scale(16),
    fontWeight: '800',
    letterSpacing: 0.5
  },
  nextBtnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },

  bottomSpacer: { height: SCREEN_HEIGHT * 0.03 }
});
