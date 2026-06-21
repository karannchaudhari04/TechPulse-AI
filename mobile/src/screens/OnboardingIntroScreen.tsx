import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Dimensions, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

interface OnboardingIntroScreenProps {
  onNext: () => void;
}

export default function OnboardingIntroScreen({ onNext }: OnboardingIntroScreenProps) {
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const translateY = useSharedValue(0);

  // Floating hover animation for TechBot
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  // Incremental typing animation for tagline
  useEffect(() => {
    const fullTextLine1 = "Master tech, ";
    const fullTextLine2 = "one bite at a time.";
    let idx1 = 0;
    let idx2 = 0;
    let interval: any;

    interval = setInterval(() => {
      if (idx1 < fullTextLine1.length) {
        setLine1((prev) => prev + fullTextLine1.charAt(idx1));
        idx1++;
      } else if (idx2 < fullTextLine2.length) {
        setLine2((prev) => prev + fullTextLine2.charAt(idx2));
        idx2++;
      } else {
        clearInterval(interval);
      }
    }, 45);

    return () => clearInterval(interval);
  }, []);

  const animatedBotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Header */}
        <View style={styles.topSection}>
           <View style={styles.botRow}>
              <Animated.View style={animatedBotStyle}>
                <Image 
                  source={require('../../assets/techbot.jpg')}
                  style={styles.botIcon}
                  resizeMode="contain"
                />
              </Animated.View>
              <View style={styles.bubble}>
                 <Text style={styles.bubbleText}>
                   {line1}
                   {line1.length >= 13 && "\n"}
                   <Text style={styles.highlightText}>{line2}</Text>
                 </Text>
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
                 pressed && styles.btnPressed
               ]}
            >
               <LinearGradient
                 colors={['#6366F1', '#4F46E5']}
                 start={{ x: 0, y: 0 }}
                 end={{ x: 1, y: 0 }}
                 style={[styles.startBtn, styles.startBtnWrapper]}
               >
                 <Text style={styles.btnText}>Let's start</Text>
                 <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
               </LinearGradient>
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
  
  startBtnWrapper: { 
    width: scale(280), // Scaled width
    height: scale(56), // Scaled height
    borderRadius: scale(28), 
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtn: { 
    width: '100%',
    height: '100%',
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: scale(10),
  },
  btnText: { color: '#FFFFFF', fontSize: scale(18), fontWeight: '800', letterSpacing: 0.5 },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.96 }] }
});
