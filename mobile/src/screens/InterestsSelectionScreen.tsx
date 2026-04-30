import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, SafeAreaView, Dimensions
} from 'react-native';
import { apiClient } from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { name: 'All things tech', emoji: '🌐' },
  { name: 'The Big Tech', emoji: '🌆' },
  { name: 'Start-ups', emoji: '💡' },
  { name: 'Space Tech', emoji: '🚀' },
  { name: 'AI/ML', emoji: '🤖' },
  { name: 'JavaScript', emoji: '✨' },
  { name: 'Python', emoji: '🐍' },
  { name: 'Java', emoji: '☕' },
  { name: 'TypeScript', emoji: '📜' },
  { name: 'Rust', emoji: '🦀' },
  { name: 'Go', emoji: '🚙' },
  { name: 'Cybersecurity', emoji: '🛡️' },
  { name: 'Career Tips', emoji: '🎓' }
];

interface InterestsSelectionScreenProps {
  onComplete: () => void;
}

export default function InterestsSelectionScreen({ onComplete }: InterestsSelectionScreenProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (catName: string) => {
    setSelected(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleContinue = async () => {
    if (selected.length === 0) return;
    setIsSaving(true);
    try {
      await apiClient.post('/users/preferences', { categories: selected });
      onComplete();
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      Alert.alert('Error', 'Could not save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Step Indicator */}
        <View style={styles.stepHeader}>
           <Text style={styles.stepTitle}>Getting started</Text>
           <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepDot} />
              <View style={styles.stepDot} />
              <Text style={styles.stepText}>1 of 4</Text>
           </View>
        </View>

        {/* Card Container */}
        <View style={styles.mainCard}>
            <Text style={styles.cardTitle}>Let’s initialize your feed.</Text>
            <Text style={styles.cardSubtitle}>Pick any topics you love. You can reconfigure these settings anytime.</Text>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.grid}>
                    {CATEGORIES.map(cat => {
                        const isSelected = selected.includes(cat.name);
                        return (
                            <TouchableOpacity
                                key={cat.name}
                                onPress={() => toggle(cat.name)}
                                activeOpacity={0.8}
                                style={[styles.chip, isSelected && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                    {cat.name} {cat.emoji}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Next Button */}
            <View style={styles.nextContainer}>
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={selected.length === 0 || isSaving}
                    style={[styles.nextBtn, selected.length === 0 && styles.nextBtnDisabled]}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.nextIcon}>→</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1 },
  stepHeader: { paddingHorizontal: 24, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepTitle: { color: '#94A3B8', fontSize: 18, fontWeight: '500' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 8, height: 4, borderRadius: 2, backgroundColor: '#1E293B', marginHorizontal: 2 },
  stepDotActive: { backgroundColor: '#6366F1', width: 24 },
  stepText: { color: '#94A3B8', fontSize: 14, marginLeft: 12, fontWeight: '700' },
  mainCard: { 
    flex: 1, 
    backgroundColor: '#0F172A', 
    margin: 16, 
    borderRadius: 32, 
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  cardTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  cardSubtitle: { color: '#94A3B8', fontSize: 16, lineHeight: 22, marginBottom: 24 },
  scrollContent: { paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  chipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
  },
  chipText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  nextContainer: { position: 'absolute', bottom: 24, right: 24 },
  nextBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtnDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    elevation: 0
  },
  nextIcon: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' }
});
