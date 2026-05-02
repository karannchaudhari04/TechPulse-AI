import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet, Dimensions, Share } from 'react-native';
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
      // Use the actual web link or a deep link
      const shareLink = `https://techbite.app/bite/${item.id}`;
      await Share.share({
        message: `🚀 TechBite: ${item.title}\n\nCheck it out: ${shareLink}`,
        url: shareLink,
      });
    } catch (error) {
      // Handle silently
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
          
          <View style={styles.summaryList}>
              {summaryPoints.slice(0, 10).map((point, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                      <Ionicons name="ellipse" size={6} color="#6366F1" style={styles.bulletIcon} />
                      <Text style={styles.bulletText} numberOfLines={4}>{point.trim()}</Text>
                  </View>
              ))}
          </View>

          <Pressable onPress={handleOpenSource} style={styles.sourceLink}>
              <Text style={styles.sourceText}>
                {new URL(item.originalSourceUrl || 'https://techbite.app').hostname.replace('www.', '')} ↗
              </Text>
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

            <Pressable onPress={handleShare} style={styles.actionBtn}>
               <Image 
                 source={require('../../assets/share.png')} 
                 style={styles.iconAsset} 
                 contentFit="contain"
               />
               <Text style={styles.actionText}>Share</Text>
            </Pressable>
        </View>

        {/* Progress Bar (Bottom) */}
        <View style={styles.progressBar}>
           <View style={[styles.progressFill, { width: '40%' }]} />
        </View>

      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { width: SCREEN_WIDTH, backgroundColor: '#020617', padding: 12 },
  card: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 32,
    overflow: 'hidden',
  },
  imageSection: { height: SCREEN_HEIGHT * (1/7), width: '100%', position: 'relative' },
  heroImg: { ...StyleSheet.absoluteFillObject },
  imgOverlay: { ...StyleSheet.absoluteFillObject },
  
  badgeRow: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  categoryBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  categoryText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  topPickBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  topPickText: { color: '#FBBF24', fontSize: 11, fontWeight: '700' },
  
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30, letterSpacing: -0.5, marginBottom: 12 },
  
  contentSection: { flex: 1, paddingHorizontal: 22, paddingTop: 15 },
  summaryList: { marginTop: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  bulletIcon: { marginTop: 10, marginRight: 14 },
  bulletText: { color: '#CBD5E1', fontSize: 17, lineHeight: 28, fontWeight: '400', flex: 1 },
  
  sourceLink: { marginTop: 'auto', marginBottom: 12 },
  sourceText: { color: '#64748B', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
  
  actionBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 14,
  },
  leftActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 },
  actionText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  iconAsset: { width: 24, height: 24 },

  progressBar: { height: 3, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill: { height: '100%', backgroundColor: '#6366F1' }
});

export default BiteCard;
