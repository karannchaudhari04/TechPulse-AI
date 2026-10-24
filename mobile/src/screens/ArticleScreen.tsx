import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';

type Props = NativeStackScreenProps<RootStackParamList, 'Article'>;

export default function ArticleScreen({ route, navigation }: Props) {
  const { url, title } = route.params;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const progress = useSharedValue(0);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <View style={styles.sourceRow}>
              <Ionicons name="globe-outline" size={10} color="#94A3B8" />
              <Text style={styles.headerSubtitle} numberOfLines={1}>{url.split('/')[2]}</Text>
            </View>
          </View>

          <View style={{ width: 44 }} />
        </View>
        
        {/* Animated Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </View>

      <WebView 
        source={{ uri: url }}
        style={styles.webview}
        onLoadProgress={({ nativeEvent }) => {
          progress.value = withSpring(nativeEvent.progress, { damping: 20 });
        }}
        onLoadEnd={() => {
          setLoading(false);
          progress.value = withSpring(1);
          setTimeout(() => {
             progress.value = 0;
          }, 500);
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#0A0A0A',
    zIndex: 10,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  progressContainer: {
    height: 2,
    width: '100%',
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: -1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
});
