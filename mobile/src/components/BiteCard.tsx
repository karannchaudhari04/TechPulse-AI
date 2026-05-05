import React, { useRef } from 'react';
import { View, Text, Pressable, Linking, StyleSheet, Dimensions, Share, Platform } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import { Bite } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence 
} from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { likeBite } from '../api/bites';
import { useQueryClient } from '@tanstack/react-query';

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
  const viewShotRef = useRef<ViewShot>(null);
  const [likes, setLikes] = React.useState(item.engagementCount || 0);
  const [hasLiked, setHasLiked] = React.useState(item.isLiked || false);
  const [localBookmarked, setLocalBookmarked] = React.useState(isBookmarked);

  // Sync with prop if changed from elsewhere
  React.useEffect(() => {
    setLocalBookmarked(isBookmarked);
  }, [isBookmarked]);

  const handleOpenSource = () => {
    if (item.originalSourceUrl) {
      navigation.navigate('Article', { 
        url: item.originalSourceUrl,
        title: item.title 
      });
    }
  };

  const handleLike = async () => {
    // Subtle pop for like only
    likeScale.value = withSequence(withSpring(1.3), withSpring(1));

    if (hasLiked) {
      // UNLIKE
      setLikes(prev => Math.max(0, prev - 1));
      setHasLiked(false);
      try {
        // We'll need a backend endpoint for unlike, or just use the same one if it toggles
        const newCount = await likeBite(item.id); 
        setLikes(newCount);
      } catch (error) {
        setLikes(prev => prev + 1);
        setHasLiked(true);
      }
    } else {
      // LIKE
      setLikes(prev => prev + 1);
      setHasLiked(true);
      try {
        const newCount = await likeBite(item.id);
        setLikes(newCount); 
      } catch (error) {
        setLikes(prev => prev - 1);
        setHasLiked(false);
      }
    }
  };

  const handleShare = async () => {
    try {
      const shareLink = `https://techbite.app/bite/${item.id}`;
      const message = `🚀 TechBite: ${item.title}\n\nMaster tech, one bite at a time. Check it out: ${shareLink}`;

      // 1. Try to capture the "Smart Card" image
      let shareUri = null;
      try {
        if (viewShotRef.current) {
          const uri = await captureRef(viewShotRef, {
            format: 'png',
            quality: 1,
          });
          
          // Android Fix: Copy to a shareable location
          shareUri = `${FileSystem.cacheDirectory}techbite_${item.id}.png`;
          await FileSystem.copyAsync({
            from: uri,
            to: shareUri,
          });
        }
      } catch (snapshotError) {
        console.warn('[Growth] Native snapshot not available. Falling back to link.');
      }

      // 2. Share the best available content
      if (shareUri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(shareUri, {
          dialogTitle: 'Share TechBite Card',
          UTI: 'public.png',
          mimeType: 'image/png',
        });
      } else {
        // Fallback to text sharing
        await Share.share({
          message: message,
          url: shareLink,
        });
      }
    } catch (error) {
      console.error('[Growth] Sharing failed:', error);
    }
  };

  // Spark Animations
  const likeScale = useSharedValue(1);
  const saveScale = useSharedValue(1);

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }]
  }));

  const saveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }]
  }));

  const handleToggleBookmark = () => {
    // Instant local feedback
    const newState = !localBookmarked;
    setLocalBookmarked(newState);
    
    // Subtle pop for save only
    saveScale.value = withSequence(withSpring(1.3), withSpring(1));
    
    onToggleBookmark(item);
  };

  // Split summary into bullets if possible
  const summaryPoints = item.contentSummary.includes('•') 
    ? item.contentSummary.split('•').filter(p => p.trim().length > 0)
    : item.contentSummary.split('. ').filter(p => p.trim().length > 0);

  return (
    <View style={[styles.root, { height: cardHeight }]}>
      <ViewShot ref={viewShotRef} style={styles.card}>
        
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
        <View style={styles.actionBar}>
            <View style={styles.leftActions}>
               <Pressable onPress={handleLike} style={styles.actionBtn}>
                  <Animated.View style={likeAnimatedStyle}>
                    <Image 
                      source={hasLiked ? require('../../assets/liked.png') : require('../../assets/like.png')} 
                      style={styles.iconAsset} 
                      contentFit="contain"
                    />
                  </Animated.View>
                  <Text style={[styles.statText, hasLiked && { color: '#F87171' }]}>{likes}</Text>
               </Pressable>
               
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

            <View style={styles.rightActions}>
                <Pressable onPress={handleOpenSource} style={styles.actionBtn}>
                  <Image 
                    source={require('../../assets/source.png')} 
                    style={styles.iconAsset} 
                    contentFit="contain"
                  />
                  <Text style={styles.actionText}>Source</Text>
                </Pressable>

                <Pressable onPress={handleShare} style={styles.actionBtn}>
                  <Image 
                    source={require('../../assets/share.png')} 
                    style={styles.iconAsset} 
                    contentFit="contain"
                  />
                  <Text style={styles.actionText}>Share</Text>
                </Pressable>
            </View>
        </View>

        {/* Progress Bar (Bottom) */}
        <View style={styles.progressBar}>
           <View style={[styles.progressFill, { width: '80%' }]} />
        </View>

      </ViewShot>
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
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: scale(24), 
    paddingVertical: scale(18),
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)'
  },
  leftActions: { flexDirection: 'row', alignItems: 'center', gap: scale(24) },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: scale(16) },
  statText: { color: '#94A3B8', fontSize: scale(13), fontWeight: '700', marginTop: 2 },
  actionBtn: { alignItems: 'center', gap: scale(4) },
  actionText: { color: '#94A3B8', fontSize: scale(11), fontWeight: '700', marginTop: 2 },
  iconAsset: { width: scale(22), height: scale(22) },

  progressBar: { height: 2, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', shadowColor: '#6366F1', shadowRadius: 4, shadowOpacity: 0.5 }
});

export default BiteCard;
