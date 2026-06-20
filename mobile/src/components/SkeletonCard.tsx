import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';
import { useTheme } from '../utils/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

export default function SkeletonCard({ cardHeight }: { cardHeight: number }) {
  const { colors, isAmoled } = useTheme();
  const shimmerOpacity = useSharedValue(0.3);

  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 900 }),
        withTiming(0.3, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <View style={[styles.root, { height: cardHeight, backgroundColor: colors.rootBackground }]}>
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: isAmoled ? 1 : 0 }]}>
        
        {/* Mock Image Header */}
        <Animated.View style={[styles.imagePlaceholder, shimmerStyle]} />

        {/* Mock Content area */}
        <View style={styles.contentSection}>
          
          {/* Mock Title Blocks */}
          <Animated.View style={[styles.titleLine1, shimmerStyle]} />
          <Animated.View style={[styles.titleLine2, shimmerStyle]} />

          {/* Spacer */}
          <View style={{ height: scale(20) }} />

          {/* Mock Bullets */}
          <View style={styles.bulletsContainer}>
            {[1, 2, 3].map((key) => (
              <View key={key} style={styles.bulletRow}>
                <Animated.View style={[styles.bulletDot, shimmerStyle]} />
                <View style={{ flex: 1, gap: scale(8) }}>
                  <Animated.View style={[styles.bulletLine1, shimmerStyle]} />
                  <Animated.View style={[styles.bulletLine2, shimmerStyle]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Mock Floating Action Bar Container */}
        <View style={styles.actionBarContainer}>
          <Animated.View 
            style={[
              styles.actionBarPlaceholder, 
              shimmerStyle,
              { 
                backgroundColor: isAmoled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', 
                borderColor: colors.border 
              }
            ]} 
          />
          {/* Mock Center Bot Button */}
          <Animated.View style={[styles.centerBotButtonPlaceholder, shimmerStyle]} />
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: SCREEN_WIDTH, padding: scale(12) },
  card: {
    flex: 1,
    borderRadius: scale(32),
    overflow: 'hidden',
  },
  imagePlaceholder: {
    height: SCREEN_HEIGHT * 0.20,
    width: '100%',
    backgroundColor: '#1E293B',
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: scale(24),
    paddingTop: scale(20),
  },
  titleLine1: {
    width: '90%',
    height: scale(22),
    borderRadius: scale(6),
    backgroundColor: '#1E293B',
    marginBottom: scale(8),
  },
  titleLine2: {
    width: '60%',
    height: scale(22),
    borderRadius: scale(6),
    backgroundColor: '#1E293B',
  },
  bulletsContainer: {
    gap: scale(16),
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
  },
  bulletDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#1E293B',
    marginTop: scale(6),
  },
  bulletLine1: {
    width: '95%',
    height: scale(14),
    borderRadius: scale(4),
    backgroundColor: '#1E293B',
  },
  bulletLine2: {
    width: '80%',
    height: scale(14),
    borderRadius: scale(4),
    backgroundColor: '#1E293B',
  },
  actionBarContainer: {
    position: 'absolute',
    bottom: scale(16),
    left: scale(16),
    right: scale(16),
    height: scale(54),
    zIndex: 10,
  },
  actionBarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: scale(20),
    borderWidth: 1,
  },
  centerBotButtonPlaceholder: {
    position: 'absolute',
    top: scale(-16),
    left: '50%',
    marginLeft: scale(-28),
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#1E293B',
    zIndex: 15,
  },
});
