import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, SafeAreaView, Dimensions
} from 'react-native';
import { apiClient } from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pick your{"\n"}<Text style={styles.accent}>Topics.</Text></Text>
          <Text style={styles.subtitle}>Select the tech areas you want to master.</Text>
        </View>

        {/* Categories Grid */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {CATEGORIES.map(cat => {
              const isSelected = selected.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => toggle(cat)}
                  activeOpacity={0.8}
                  style={[styles.chip, isSelected && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {cat}
                  </Text>
                  {isSelected && <View style={styles.checkDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer Action */}
        <View style={styles.footer}>
          <View style={styles.counterRow}>
            <Text style={styles.counterText}>
              <Text style={styles.counterValue}>{selected.length}</Text> topics selected
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleContinue}
            disabled={selected.length === 0 || isSaving}
            style={[styles.continueBtn, selected.length === 0 && styles.continueBtnDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueBtnText}>Continue to Feed</Text>
            )}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 32, paddingTop: 40, paddingBottom: 32 },
  title: { color: '#FFFFFF', fontSize: 48, fontWeight: '900', letterSpacing: -2, lineHeight: 52 },
  accent: { color: '#6366F1' },
  subtitle: { color: '#64748B', fontSize: 16, marginTop: 12, fontWeight: '500' },
  scrollContent: { paddingBottom: 40 },
  grid: { paddingHorizontal: 32, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: '#6366F1',
  },
  chipText: { color: '#94A3B8', fontSize: 16, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  checkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1', marginLeft: 10 },
  footer: { padding: 32, borderTopWidth: 1, borderTopColor: '#0F172A', backgroundColor: '#020617' },
  counterRow: { marginBottom: 20, alignItems: 'center' },
  counterText: { color: '#475569', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  counterValue: { color: '#6366F1' },
  continueBtn: {
    backgroundColor: '#6366F1',
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  continueBtnDisabled: {
    backgroundColor: '#1E293B',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.5
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' }
});
