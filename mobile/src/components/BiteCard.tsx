import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet, Dimensions, Share } from 'react-native';
import { Image } from 'expo-image';
import { Bite } from '../types';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BiteCardProps { 
  item: Bite; 
  isBookmarked: boolean;
  onToggleBookmark: (bite: Bite) => void;
  fullScreen?: boolean;
  cardHeight?: number;
}

const CATEGORY_COLORS: any = {
  'Data Structures': '#10B981',
  'Artificial Intelligence': '#8B5CF6',
  'Web Development': '#0EA5E9',
  'Hardware & Chips': '#F59E0B',
  'Cybersecurity': '#EF4444',
  'System Design': '#EC4899',
  'Open Source': '#6366F1',
  'Career Tips': '#4F46E5',
  'default': '#6366F1',
};

const BiteCard = React.memo(({ item, isBookmarked, onToggleBookmark, cardHeight }: BiteCardProps) => {
  
  const handleOpenSource = () => {
    if (item.originalSourceUrl) {
      Linking.openURL(item.originalSourceUrl).catch(err => {});
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🚀 TechBite: ${item.title}\n\nRead more: techbite://bite/${item.id}`,
        url: item.originalSourceUrl,
        title: item.title,
      });
    } catch (error) {
      console.error('Sharing failed', error);
    }
  };

  const summaryPoints = item.contentSummary.includes('•') 
    ? item.contentSummary.split('•').filter(p => p.trim().length > 0)
    : [item.contentSummary];

  return (
    <View style={[styles.root, { height: cardHeight }]}>
      <View style={styles.card}>
        
        {/* Header: Hero Image + Badges + Integrated Title */}
        <View style={styles.headerArea}>
          <Image 
            source={{ uri: item.thumbnailUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800' }}
            style={styles.heroImg}
            contentFit="cover"
          />
          <LinearGradient 
            colors={['rgba(30, 41, 59, 0.4)', 'rgba(2, 6, 23, 0.95)']} 
            style={styles.imgOverlay} 
          />
          
          <View style={styles.badgeRow}>
            <View style={styles.tldrBadge}>
                <Text style={styles.tldrText}>TL;DR</Text>
            </View>
            <View style={styles.topPickBadge}>
                <Text style={styles.topPickText}>✨ Top Pick</Text>
            </View>
          </View>

          <Text style={styles.headerTitle} numberOfLines={2}>{item.title}</Text>
        </View>

        {/* Content: Bulleted List */}
        <View style={styles.contentBox}>
          <View style={styles.summaryContainer}>
              {summaryPoints.map((point, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>{point.trim()}</Text>
                  </View>
              ))}
          </View>

          {/* Inline Source Link */}
          <Pressable onPress={handleOpenSource} style={styles.sourceLink}>
              <Text style={styles.sourceText}>{item.categoryName} ↗</Text>
          </Pressable>
        </View>

        {/* Footer: Floating Actions (Streak, Bookmark, Share) */}
        <View style={styles.footerRow}>
            <View style={styles.leftActions}>
               <View style={styles.actionItem}>
                  <Text style={styles.actionEmoji}>🔥</Text>
                  <Text style={styles.actionCount}>11</Text>
               </View>
            </View>

            <View style={styles.rightActions}>
                <Pressable onPress={() => onToggleBookmark(item)} style={styles.iconBtn}>
                  <Text style={styles.icon}>{isBookmarked ? '💙' : '🔖'}</Text>
                </Pressable>
                
                <Pressable onPress={handleShare} style={styles.iconBtn}>
                  <Text style={styles.icon}>📤</Text>
                </Pressable>
            </View>
        </View>

        {/* Bottom Progress Indicator */}
        <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '45%' }]} />
        </View>

      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { backgroundColor: '#020617', paddingHorizontal: 12, paddingVertical: 10 },
  card: {
    flex: 1,
    backgroundColor: '#020617', // Match SS dark background
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  headerArea: { height: '35%', width: '100%', position: 'relative', justifyContent: 'flex-end', padding: 20 },
  heroImg: { ...StyleSheet.absoluteFillObject },
  imgOverlay: { ...StyleSheet.absoluteFillObject },
  badgeRow: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', gap: 8 },
  tldrBadge: { backgroundColor: '#000', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tldrText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  topPickBadge: { backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  topPickText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', lineHeight: 28, letterSpacing: -0.5 },
  contentBox: { flex: 1, padding: 24, paddingTop: 30 },
  summaryContainer: { gap: 14 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bullet: { color: '#FFFFFF', fontSize: 18, marginRight: 12, opacity: 0.8 },
  bulletText: { color: '#94A3B8', fontSize: 15, lineHeight: 22, fontWeight: '500', flex: 1 },
  sourceLink: { marginTop: 20 },
  sourceText: { color: '#475569', fontSize: 14, fontWeight: '600' },
  footerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingBottom: 24 
  },
  leftActions: { flexDirection: 'row' },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionEmoji: { fontSize: 18 },
  actionCount: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  rightActions: { flexDirection: 'row', gap: 20 },
  iconBtn: { padding: 4 },
  icon: { fontSize: 22, color: '#94A3B8' },
  progressBar: { height: 3, width: '100%', backgroundColor: '#1E293B' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 2 }
});


export default BiteCard;
