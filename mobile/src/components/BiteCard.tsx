import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet, Dimensions, Share, Platform } from 'react-native';
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
import { likeBite, explainBite } from '../api/bites';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import ExplainModal from './ExplainModal';

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
  const [likes, setLikes] = React.useState(item.engagementCount || 0);
  const [hasLiked, setHasLiked] = React.useState(item.isLiked || false);
  const [localBookmarked, setLocalBookmarked] = React.useState(isBookmarked);

  // Sync with prop if changed from elsewhere
  React.useEffect(() => {
    setLocalBookmarked(isBookmarked);
  }, [isBookmarked]);

  const [explainModalVisible, setExplainModalVisible] = React.useState(false);

  const explainMutation = useMutation({
    mutationFn: () => explainBite(item.id),
  });

  const handleExplainSimply = () => {
    setExplainModalVisible(true);
    if (!explainMutation.data && !explainMutation.isPending) {
      explainMutation.mutate();
    }
  };

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
      const shareLink = `https://techbite.onrender.com/bite/${item.id}`;
      const message = `💡 ${item.title}\n\nRead the full high-yield breakdown on TechBite:\n🔗 ${shareLink}\n\n⚡ Master tech news & system design concepts in 2 minutes or less!`;
      
      await Share.share({
        message: message,
        url: shareLink,
      });
    } catch (error) {
      console.error('[Growth] Share failed:', error);
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
      <View style={styles.card}>
        
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

          {/* Explain Simply Premium Purple Sparkles Button */}
          <Pressable 
            onPress={handleExplainSimply}
            style={({ pressed }) => [
              styles.explainBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
            ]}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.explainGradient}
            >
              <Ionicons name="sparkles" size={14} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.explainText}>Explain Simply</Text>
            </LinearGradient>
          </Pressable>
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
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: scale(24), 
    paddingVertical: scale(18),
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)'
  },
  leftActions: { flexDirection: 'row', alignItems: 'center', gap: scale(20) },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  statText: { color: '#94A3B8', fontSize: scale(13), fontWeight: '700', marginTop: 2 },
  actionBtn: { alignItems: 'center', gap: scale(4) },
  actionText: { color: '#94A3B8', fontSize: scale(11), fontWeight: '700', marginTop: 2 },
  iconAsset: { width: scale(22), height: scale(22) },

  progressBar: { height: 2, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', shadowColor: '#6366F1', shadowRadius: 4, shadowOpacity: 0.5 },
  explainBtn: {
    marginVertical: scale(8),
    borderRadius: scale(16),
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  explainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
  },
  explainText: {
    color: '#FFFFFF',
    fontSize: scale(13),
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default BiteCard;
