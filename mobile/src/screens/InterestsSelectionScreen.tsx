import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, SafeAreaView
} from 'react-native';
import { apiClient } from '../api/client';

// These names must EXACTLY match the category `name` column in the DB
// These names must EXACTLY match the category `name` column in the DB
const CATEGORIES = [
  'Artificial Intelligence', 
  'Web Development', 
  'Data Structures',
  'Cybersecurity', 
  'Hardware & Chips', 
  'System Design', 
  'Open Source', 
  'Career Tips'
];

interface InterestsSelectionScreenProps {
  onComplete: () => void;
}

export default function InterestsSelectionScreen({ onComplete }: InterestsSelectionScreenProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (cat: string) => {
    setSelected(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleContinue = async () => {
    if (selected.length === 0) return;
    setIsSaving(true);
    try {
      // Send categories to backend
      await apiClient.post('/users/preferences', { categories: selected });
      
      // Successfully saved!
      onComplete();
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      Alert.alert(
        'Preferences Not Set',
        'We could not save your topics right now. Your experience might be limited.',
        [{ text: 'Try Again', style: 'default' }, { text: 'Continue Anyway', onPress: onComplete }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>What interests you?</Text>
        <Text style={styles.subtitle}>
          Pick topics to curate your personalised{' '}
          <Text style={styles.accent}>For You</Text> feed.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map(cat => {
          const isSelected = selected.includes(cat);
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => toggle(cat)}
              style={[styles.chip, isSelected && styles.chipSelected]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.selectionCount}>
          {selected.length} topic{selected.length !== 1 ? 's' : ''} selected
        </Text>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={selected.length === 0 || isSaving}
          style={[styles.continueBtn, (selected.length === 0 || isSaving) && styles.continueBtnDisabled]}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueBtnText}>Continue to Feed →</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 24 },
  title: {
    fontSize: 40, fontWeight: '900', color: '#F8FAFC',
    letterSpacing: -1.5, marginBottom: 12, lineHeight: 46
  },
  subtitle: { color: '#94A3B8', fontSize: 17, lineHeight: 26, fontWeight: '500' },
  accent: { color: '#7C3AED', fontWeight: '800' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    paddingHorizontal: 28, paddingBottom: 40,
  },
  chip: {
    paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#1E293B',
    backgroundColor: '#1E293B',
  },
  chipSelected: {
    backgroundColor: '#7C3AED', borderColor: '#7C3AED',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  chipText: { color: '#64748B', fontWeight: '700', fontSize: 15 },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '800' },
  footer: {
    padding: 28, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: '#1E293B',
    gap: 16,
  },
  selectionCount: {
    color: '#64748B', fontSize: 14, fontWeight: '700',
    textAlign: 'center', letterSpacing: 0.5,
  },
  continueBtn: {
    backgroundColor: '#7C3AED', paddingVertical: 20,
    borderRadius: 22, alignItems: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4, shadowRadius: 15, elevation: 8,
  },
  continueBtnDisabled: { backgroundColor: '#1E293B', shadowOpacity: 0, elevation: 0 },
  continueBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 18, letterSpacing: 0.5 },
});
