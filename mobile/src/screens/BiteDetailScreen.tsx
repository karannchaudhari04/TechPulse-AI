import React from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Text, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import BiteCard from '../components/BiteCard';
import { getBiteById } from '../api';
import { useBookmarks } from '../hooks/useBookmarks';
import { auth } from '../utils/firebase';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'BiteDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

export default function BiteDetailScreen({ route, navigation }: Props) {
  const params = route.params || {};
  const rawId = params.id;
  const id = typeof rawId === 'string' ? parseInt(rawId, 10) : rawId;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Safety check: Only go to Home if user is logged in
      const user = auth.currentUser;
      if (user) {
        // @ts-ignore - Home might be hidden in some flows
        navigation.replace('Home');
      } else {
        navigation.replace('Welcome');
      }
    }
  };

  const { isBookmarked, toggleBookmark } = useBookmarks();

  const { data: bite, isLoading, error } = useQuery({
    queryKey: ['bite', id],
    queryFn: () => getBiteById(id),
    enabled: !!id // Only run query if we have an ID
  });

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Invalid link or missing ID.</Text>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

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
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <Pressable onPress={handleBack}>
                <Text style={styles.headerBack}>← Back to Feed</Text>
            </Pressable>
        </View>
        <BiteCard 
          item={bite} 
          isBookmarked={isBookmarked(bite.id)} 
          onToggleBookmark={toggleBookmark}
          cardHeight={scale(600)} // Scaled height for detail view
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1 },
  header: { padding: scale(20) },
  headerBack: { color: '#6366F1', fontSize: scale(16), fontWeight: '700' },
  center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: scale(40) },
  errorText: { color: '#94A3B8', fontSize: scale(18), textAlign: 'center', marginBottom: scale(20) },
  backBtn: { backgroundColor: '#1E293B', paddingHorizontal: scale(20), paddingVertical: scale(10), borderRadius: scale(10) },
  backBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: scale(14) }
});
