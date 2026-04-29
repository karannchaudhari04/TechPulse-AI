import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet, Dimensions } from 'react-native';
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

  const categoryColor = CATEGORY_COLORS[item.categoryName] || CATEGORY_COLORS['default'];

  return (
    <View style={[styles.root, { height: cardHeight }]}>
      <View style={styles.card}>
        
        {/* Top Section: Hero Image (Exact 33%) */}
        <View style={styles.imageBox}>
          <Image 
            source={{ uri: item.thumbnailUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800' }}
            style={styles.heroImg}
            contentFit="cover"
          />
          <LinearGradient 
            colors={['transparent', 'rgba(2, 6, 23, 0.8)']} 
            style={styles.imgOverlay} 
          />
          <View style={[styles.pill, { backgroundColor: categoryColor }]}>
            <Text style={styles.pillText}>{item.categoryName}</Text>
          </View>
        </View>

        {/* Bottom Section: Info & Actions */}
        <View style={styles.contentBox}>
          <View style={styles.textStack}>
            <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
            <Text style={styles.summary} numberOfLines={8}>{item.contentSummary}</Text>
          </View>
          
          <View style={styles.actionBar}>
            <Pressable 
              onPress={handleOpenSource}
              style={({ pressed }) => [styles.readBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.readBtnText}>Read More</Text>
              <Text style={styles.arrow}>→</Text>
            </Pressable>

            <Pressable 
              onPress={() => onToggleBookmark(item)}
              style={({ pressed }) => [
                styles.markBtn, 
                isBookmarked && styles.markBtnActive,
                pressed && { scale: 0.9 }
              ]}
            >
              <Text style={styles.markIcon}>{isBookmarked ? '💙' : '🔖'}</Text>
            </Pressable>
          </View>
        </View>

      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { backgroundColor: '#020617', paddingHorizontal: 16, paddingVertical: 12 },
  card: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  imageBox: { height: '33.3%', width: '100%', position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  imgOverlay: { position: 'absolute', inset: 0 },
  pill: {
    position: 'absolute',
    top: 24,
    left: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  pillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  contentBox: { flex: 1, padding: 32, justifyContent: 'space-between' },
  textStack: { gap: 16 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: -1, lineHeight: 34 },
  summary: { color: '#94A3B8', fontSize: 16, lineHeight: 26, fontWeight: '500' },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1.5,
    borderColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readBtnText: { color: '#818CF8', fontWeight: '900', fontSize: 15, marginRight: 10 },
  arrow: { color: '#818CF8', fontSize: 18, fontWeight: '900' },
  markBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  markBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: '#6366F1',
  },
  markIcon: { fontSize: 22 }
});

export default BiteCard;
