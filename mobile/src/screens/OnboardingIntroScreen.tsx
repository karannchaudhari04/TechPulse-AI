import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Dimensions, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

interface OnboardingIntroScreenProps {
  onNext: () => void;
}

export default function OnboardingIntroScreen({ onNext }: OnboardingIntroScreenProps) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Header */}
        <View style={styles.topSection}>
           <View style={styles.botRow}>
              <Image 
                source={require('../../assets/techbot.jpg')}
                style={styles.botIcon}
                resizeMode="contain"
              />
              <View style={styles.bubble}>
                 <Text style={styles.bubbleText}>Master tech, {"\n"}<Text style={styles.highlightText}>one bite at a time.</Text></Text>
              </View>
           </View>
        </View>

        {/* Center Card */}
        <View style={styles.centerContainer}>
           <View style={styles.glassCard}>
              <View style={styles.brandRow}>
                <Image 
                    source={require('../../assets/welcome_logo.jpg')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.brandName}>TechBite</Text>
              </View>

              <Text style={styles.description}>
                We curate high-yield interview questions, industry trends, and coding patterns to help you land your dream job.
              </Text>

              <View style={styles.illustrationWrap}>
                <Image 
                    source={require('../../assets/intro_cards.jpg')}
                    style={styles.cardsIllustration}
                    resizeMode="contain"
                />
              </View>
           </View>
        </View>

        {/* Bottom CTA Section */}
        <View style={styles.bottomSection}>
           <Text style={styles.botGreeting}>
             Your personalized roadmap to tech excellence.
           </Text>

           <Pressable 
              onPress={onNext}
              style={({ pressed }) => [
                styles.startBtn, 
                pressed && styles.btnPressed
              ]}
           >
              <Text style={styles.btnText}>Let's start</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
           </Pressable>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1 },
  
  topSection: { paddingHorizontal: scale(24), marginTop: scale(45), marginBottom: scale(5), flexShrink: 1 },
  botRow: { flexDirection: 'row', alignItems: 'center', gap: scale(16) },
  botIcon: { width: scale(70), height: scale(70) },
  bubble: { flex: 1 },
  bubbleText: { color: '#FFFFFF', fontSize: scale(26), fontWeight: '800', lineHeight: scale(32) },
  highlightText: { color: '#818CF8' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: scale(16) },
  glassCard: { 
    width: '100%',
    height: SCREEN_HEIGHT * 0.52,
    borderRadius: scale(36), 
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1.5, 
    borderColor: 'rgba(255,255,255,0.12)',
    padding: scale(28),
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  logo: { width: scale(32), height: scale(32) },
  brandName: { color: '#F8FAFC', fontSize: scale(26), fontWeight: '900' },
  description: { color: '#94A3B8', fontSize: scale(17), textAlign: 'center', lineHeight: scale(26), fontWeight: '500' },
  illustrationWrap: { width: '100%', height: '55%', justifyContent: 'center' },
  cardsIllustration: { width: '100%', height: '100%' },

  // Bottom section with NO flex to prevent stretching
  bottomSection: { 
    paddingHorizontal: scale(24), 
    paddingBottom: scale(50), 
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'transparent'
  },
  botGreeting: { color: '#94A3B8', fontSize: scale(15), textAlign: 'center', lineHeight: scale(22), marginBottom: scale(25), fontWeight: '600' },
  
  startBtn: { 
    width: scale(280), // Scaled width
    height: scale(60), // Scaled height
    minHeight: scale(60),
    maxHeight: scale(60),
    borderRadius: scale(20), 
    backgroundColor: '#818CF8',
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: scale(12),
  },
  btnText: { color: '#FFFFFF', fontSize: scale(19), fontWeight: '800' },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] }
});
