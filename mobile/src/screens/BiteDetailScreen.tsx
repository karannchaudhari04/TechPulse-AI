import React from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import BiteCard from '../components/BiteCard';
import { getBiteById } from '../api';
import { useBookmarks } from '../hooks/useBookmarks';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'BiteDetail'>;

export default function BiteDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const { data: bite, isLoading, error } = useQuery({
    queryKey: ['bite', id],
    queryFn: () => getBiteById(id)
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (error || !bite) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Bite not found or link expired.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()}>
                <Text style={styles.headerBack}>← Back to Feed</Text>
            </Pressable>
        </View>
        <BiteCard 
          item={bite} 
          isBookmarked={isBookmarked(bite.id)} 
          onToggleBookmark={toggleBookmark}
          cardHeight={600} // Fixed height for detail view
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1 },
  header: { padding: 20 },
  headerBack: { color: '#6366F1', fontSize: 16, fontWeight: '700' },
  center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { color: '#94A3B8', fontSize: 18, textAlign: 'center', marginBottom: 20 },
  backBtn: { backgroundColor: '#1E293B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: '#FFFFFF', fontWeight: '700' }
});
