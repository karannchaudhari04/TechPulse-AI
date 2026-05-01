import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet, Dimensions, Share } from 'react-native';
import { Image } from 'expo-image';
import { Bite } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { likeBite } from '../api/bites';
import { useQueryClient } from '@tanstack/react-query';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BiteCardProps { 
  item: Bite; 
  isBookmarked: boolean;
  onToggleBookmark: (bite: Bite) => void;
  cardHeight: number;
}

const BiteCard = React.memo(({ item, isBookmarked, onToggleBookmark, cardHeight }: BiteCardProps) => {
  const queryClient = useQueryClient();
  const [likes, setLikes] = React.useState(item.engagementCount || 0);
  const [hasLiked, setHasLiked] = React.useState(item.isLiked || false);

  const handleOpenSource = () => {
    if (item.originalSourceUrl) {
      Linking.openURL(item.originalSourceUrl).catch(err => {});
    }
  };

  const handleLike = async () => {
    if (hasLiked) return; // Only one like per user
    
    // Optimistic update
    setLikes(prev => prev + 1);
    setHasLiked(true);
    try {
      const newCount = await likeBite(item.id);
      setLikes(newCount); 
      // Invalidate the 'bites' query so the list picks up the new 'isLiked' and 'engagementCount'
      queryClient.invalidateQueries({ queryKey: ['bites'] });
    } catch (error) {
      console.error("[BiteCard] Like failed:", error);
      setLikes(prev => prev - 1);
      setHasLiked(false);
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

        {/* Action Bar (Updated with Custom Icons) */}
        <View style={styles.actionBar}>
            <View style={styles.leftActions}>
               <Pressable onPress={handleLike} style={styles.actionBtn}>
                  <Image 
                    source={require('../../assets/fire.png')} 
                    style={[styles.iconAsset, { tintColor: hasLiked ? "#F59E0B" : "#FFF" }]} 
                  />
                  <Text style={[styles.statText, hasLiked && { color: '#F59E0B' }]}>{likes}</Text>
               </Pressable>
               
               <Pressable onPress={() => onToggleBookmark(item)} style={styles.actionBtn}>
                  <Image 
                    source={require('../../assets/save.png')} 
                    style={[styles.iconAsset, { tintColor: isBookmarked ? "#6366F1" : "#FFF" }]} 
                  />
                  <Text style={[styles.actionText, isBookmarked && { color: '#6366F1' }]}>Save</Text>
               </Pressable>
            </View>

            <Pressable onPress={handleShare} style={styles.actionBtn}>
               <Image 
                 source={require('../../assets/share.png')} 
                 style={styles.iconAsset} 
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
  root: { width: SCREEN_WIDTH, backgroundColor: '#020617', paddingHorizontal: 16, paddingVertical: 12 },
  card: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8
  },
  imageSection: { height: SCREEN_HEIGHT * (1/6), width: '100%', position: 'relative' },
  heroImg: { ...StyleSheet.absoluteFillObject },
  imgOverlay: { ...StyleSheet.absoluteFillObject },
  
  badgeRow: { position: 'absolute', top: 16, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  categoryBadge: { backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  categoryText: { color: '#F1F5F9', fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  topPickBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  topPickText: { color: '#FDE047', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  contentSection: { flex: 1, paddingHorizontal: 24, paddingTop: 20, justifyContent: 'space-between' },
  title: { color: '#F1F5F9', fontSize: 26, fontWeight: '900', lineHeight: 32, letterSpacing: -0.8, marginBottom: 16 },
  summaryList: { gap: 14 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bulletIcon: { marginTop: 10, marginRight: 16, opacity: 0.8 },
  bulletText: { color: '#94A3B8', fontSize: 16, lineHeight: 26, fontWeight: '500', flex: 1 },
  
  sourceLink: { marginTop: 12, marginBottom: 12, alignSelf: 'flex-start' },
  sourceText: { color: '#6366F1', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  
  actionBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#1E293B'
  },
  leftActions: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4 },
  actionText: { color: '#F1F5F9', fontSize: 13, fontWeight: '800' },
  statText: { color: '#F1F5F9', fontSize: 14, fontWeight: '900' },
  iconAsset: { width: 22, height: 22, contentFit: 'contain' },

  progressBar: { height: 4, width: '100%', backgroundColor: '#020617' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 2 }
});

export default BiteCard;
