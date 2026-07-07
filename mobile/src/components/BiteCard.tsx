import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Bite } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  interpolate
} from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { explainBite } from '../api/bites';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import ExplainModal from './ExplainModal';
import { useTheme } from '../utils/theme';
import { userApi } from '../api/user';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive Scaling Helper (Based on standard 375px width)
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

interface BiteCardProps { 
  item: Bite; 
  isBookmarked: boolean;
  onToggleBookmark: (bite: Bite) => void;
  cardHeight: number;
  fullScreen?: boolean;
}

const BiteCard = React.memo(({ item, isBookmarked, onToggleBookmark, cardHeight, fullScreen = false }: BiteCardProps) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { isAmoled, colors } = useTheme();
  const [localBookmarked, setLocalBookmarked] = React.useState(isBookmarked);
  const [logoError, setLogoError] = React.useState(false);

  // Sync states when FlashList recycles this card for a new item (separates likes/bookmarks per bite)
  React.useEffect(() => {
    setLocalBookmarked(isBookmarked);
    setLogoError(false);
  }, [item.id, isBookmarked]);

  const domain = React.useMemo(() => {
    try {
      const matches = item.originalSourceUrl.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
      return matches && matches[1] ? matches[1] : '';
    } catch (e) {
      return '';
    }
  }, [item.originalSourceUrl]);

  const logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  const sourceImage = logoError || !domain
    ? require('../../assets/source.png')
    : { uri: logoUrl };

  const explainBtnScale = useSharedValue(1);
  const sourceBtnScale = useSharedValue(1);
  const explainGlow = useSharedValue(0);
  const botBob = useSharedValue(0);
  const sparkleScale = useSharedValue(0.8);
  const sparkleOpacity = useSharedValue(0.4);

  React.useEffect(() => {
    // Infinite slow bobbing loop for robot mascot
    botBob.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Infinite breathing glow loop
    explainGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );

    // Infinite scale/opacity twinkle loop for sparkles
    sparkleScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    sparkleOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const sourceBtnAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: sourceBtnScale.value }]
    };
  });

  const explainBtnAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: explainBtnScale.value },
        { translateY: botBob.value }
      ]
    };
  });

  const [explainModalVisible, setExplainModalVisible] = React.useState(false);

  const explainMutation = useMutation({
    mutationFn: () => explainBite(item.id),
  });

  const handleExplainSimply = () => {
    Haptics.selectionAsync().catch(() => {});
    setExplainModalVisible(true);
    userApi.recordInteraction('category:' + item.categoryName, 'SEARCH')
      .catch((err) => console.warn('[Analytics] Failed to record search interaction:', err));
    if (!explainMutation.data && !explainMutation.isPending) {
      explainMutation.mutate();
    }
  };

  const handleOpenSource = () => {
    if (item.originalSourceUrl) {
      userApi.recordInteraction('category:' + item.categoryName, 'CLICK')
        .catch((err) => console.warn('[Analytics] Failed to record click interaction:', err));
      navigation.navigate('Article', { 
        url: item.originalSourceUrl,
        title: item.title 
      });
    }
  };



  // Spark Animations
  const saveScale = useSharedValue(1);

  const saveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }]
  }));

  const handleToggleBookmark = () => {
    // Instant local feedback
    const newState = !localBookmarked;
    setLocalBookmarked(newState);
    
    // Subtle pop for save only
    saveScale.value = withSequence(withSpring(1.3), withSpring(1));
    
    if (newState) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      userApi.recordInteraction('category:' + item.categoryName, 'BOOKMARK')
        .catch((err) => console.warn('[Analytics] Failed to record bookmark interaction:', err));
    }
    
    onToggleBookmark(item);
  };

  // Split summary into bullets if possible
  const summaryPoints = item.contentSummary.includes('•') 
    ? item.contentSummary.split('•').filter(p => p.trim().length > 0)
    : item.contentSummary.split('. ').filter(p => p.trim().length > 0);

  return (
    <View style={[styles.root, { height: cardHeight, backgroundColor: colors.rootBackground }]}>
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderWidth: isAmoled ? 1 : 0 }]}>
        
        {/* Header Section (1/6 Height) */}
        <View style={styles.imageSection}>
          <Image 
            source={{ uri: item.thumbnailUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800' }}
            style={styles.heroImg}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient 
            colors={['rgba(0,0,0,0.3)', 'transparent']} 
            style={styles.imgOverlay} 
          />
          
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.categoryName || 'Tech'}</Text>
            </View>
            <View style={styles.topPickBadge}>
                <Ionicons name="sparkles" size={12} color="#FBBF24" />
                <Text style={styles.topPickText}>Top Pick</Text>
            </View>
          </View>
        </View>

        {/* Content Section (Title + Expanded Summary) */}
        <View style={styles.contentSection}>
          <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
          
          <View style={{ flex: 1 }}>
            <Animated.ScrollView 
              style={styles.summaryList} 
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
                {summaryPoints.slice(0, 4).map((point, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                        <Text style={styles.bulletText}>• {point.trim()}</Text>
                    </View>
                ))}
            </Animated.ScrollView>
          </View>
        </View>

        {/* Action Bar */}
        <View style={[styles.actionBar, { backgroundColor: isAmoled ? 'rgba(17, 17, 17, 0.85)' : 'rgba(30, 41, 59, 0.8)', borderColor: colors.border }]}>
            <View style={styles.leftActions}>
               <Pressable onPress={handleToggleBookmark} style={styles.actionBtn}>
                  <Animated.View style={saveAnimatedStyle}>
                    <Image 
                      source={localBookmarked ? require('../../assets/savebite.png') : require('../../assets/save.png')} 
                      style={styles.iconAsset} 
                      contentFit="contain"
                    />
                  </Animated.View>
                  <Text style={[styles.actionText, localBookmarked && { color: '#6366F1' }]}>Save</Text>
               </Pressable>
            </View>

            {/* Central Floating Source Button with Logo */}
            <Pressable 
              onPress={handleOpenSource}
              onPressIn={() => { sourceBtnScale.value = withSpring(0.90, { damping: 15, stiffness: 200 }); }}
              onPressOut={() => { sourceBtnScale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
              style={styles.centerSourceBtnWrapper}
            >
              <Animated.View style={[styles.centerSourceBtn, sourceBtnAnimatedStyle]}>
                <Image 
                  source={sourceImage}
                  style={styles.sourceLogoImage}
                  contentFit="contain"
                  onError={() => setLogoError(true)}
                />
              </Animated.View>
              <Text style={styles.centerSourceText}>Source</Text>
            </Pressable>

            <View style={styles.rightActions}>
                <Pressable 
                  onPress={handleExplainSimply}
                  onPressIn={() => { explainBtnScale.value = withSpring(0.90, { damping: 15, stiffness: 200 }); }}
                  onPressOut={() => { explainBtnScale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
                  style={styles.actionBtn}
                >
                  <Animated.View style={explainBtnAnimatedStyle}>
                    <MaterialCommunityIcons name="robot" size={24} color="#8B5CF6" />
                  </Animated.View>
                  <Text style={styles.actionText}>Explain</Text>
                </Pressable>
            </View>
        </View>

        {/* Progress Bar (Bottom) */}
        <View style={[styles.progressBar, { backgroundColor: isAmoled ? '#111' : 'rgba(255,255,255,0.05)' }]}>
           <View style={[styles.progressFill, { width: '80%' }]} />
        </View>

      </View>

      <ExplainModal
        visible={explainModalVisible}
        onClose={() => {
          setExplainModalVisible(false);
          explainMutation.reset();
        }}
        title={item.title}
        explanation={explainMutation.data?.explanation || null}
        loading={explainMutation.isPending}
        error={explainMutation.error ? explainMutation.error.message : null}
        onRetry={() => explainMutation.mutate()}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { width: SCREEN_WIDTH, backgroundColor: '#020617', padding: scale(12) },
  card: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: scale(32),
    overflow: 'hidden',
  },
  imageSection: { height: SCREEN_HEIGHT * (0.20), width: '100%', position: 'relative' },
  heroImg: { ...StyleSheet.absoluteFillObject },
  imgOverlay: { ...StyleSheet.absoluteFillObject },
  
  badgeRow: { position: 'absolute', top: scale(16), left: scale(20), right: scale(20), flexDirection: 'row', justifyContent: 'space-between' },
  categoryBadge: { backgroundColor: 'rgba(99, 102, 241, 0.9)', paddingHorizontal: scale(12), paddingVertical: scale(4), borderRadius: scale(10) },
  categoryText: { color: '#FFF', fontSize: scale(10), fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  topPickBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(4), backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(10), borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)' },
  topPickText: { color: '#FBBF24', fontSize: scale(10), fontWeight: '800' },
  
  contentSection: { flex: 1, paddingHorizontal: scale(24), paddingTop: scale(20), justifyContent: 'flex-start' },
  title: { color: '#FFFFFF', fontSize: scale(22), fontWeight: '900', lineHeight: scale(28), letterSpacing: -0.5, marginBottom: scale(16) },
  
  summaryList: { marginTop: scale(4), flex: 1 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: scale(18) },
  bulletText: { color: '#E2E8F0', fontSize: scale(15), lineHeight: scale(24), fontWeight: '500', flex: 1 },
  
  sourceLink: { marginTop: scale(10), marginBottom: scale(4) },
  sourceText: { color: '#6366F1', fontSize: scale(14), fontWeight: '700', letterSpacing: 0.5 },
  
  actionBar: { 
    position: 'absolute',
    bottom: scale(16),
    left: scale(16),
    right: scale(16),
    borderRadius: scale(20),
    borderWidth: 1,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: scale(20), 
    paddingVertical: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  leftActions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' },
  rightActions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: scale(16) },
  statText: { color: '#94A3B8', fontSize: scale(13), fontWeight: '700', marginTop: 2 },
  actionBtn: { alignItems: 'center', gap: scale(4) },
  actionText: { color: '#94A3B8', fontSize: scale(11), fontWeight: '700', marginTop: 2 },
  iconAsset: { width: scale(22), height: scale(22) },

  progressBar: { height: 2, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', shadowColor: '#6366F1', shadowRadius: 4, shadowOpacity: 0.5 },
  centerSourceBtnWrapper: {
    position: 'absolute',
    top: scale(-20),
    left: '50%',
    marginLeft: scale(-28),
    width: scale(56),
    alignItems: 'center',
    zIndex: 10,
  },
  centerSourceBtn: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
    padding: scale(6),
  },
  sourceLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: scale(22),
  },
  centerSourceText: {
    color: '#94A3B8',
    fontSize: scale(11),
    fontWeight: '700',
    marginTop: scale(4),
  },
});

export default BiteCard;
