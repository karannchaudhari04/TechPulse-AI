import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { signOut } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../utils/firebase';
import { userApi } from '../api/user';
import { useQuery } from '@tanstack/react-query';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { getAuth } from 'firebase/auth';

// Inside your component or useEffect:
const getToken = async () => {
  const auth = getAuth();
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    console.log("🔥 MY ADMIN TOKEN:", token);
  }
};

getToken();

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function StatCard({ item, index, onPress }: { item: any, index: number, onPress?: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.92);
  };

  const onPressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(200 + index * 100)} 
      style={[styles.statCard, animatedStyle]}
    >
      <Pressable 
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        style={styles.statPressable}
      >
        <View style={[styles.statIconCircle, { backgroundColor: `${item.color}15` }]}>
          <Image 
            source={item.image} 
            style={{ width: 28, height: 28 }} 
            contentFit="contain"
          />
        </View>
        <Text style={styles.statValue}>{item.value}</Text>
        <Text style={styles.statLabel}>{item.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const user = auth.currentUser;

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    });
  }, []);

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userApi.getProfile(),
    enabled: !!user
  });

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out of TechBite?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              try {
                await GoogleSignin.signOut();
              } catch (e) {
                console.log("Google sign out info:", e);
              }
              await signOut(auth);
            } catch (error) {
              console.error("Sign out error:", error);
              Alert.alert("Error", "Failed to sign out.");
            }
          }
        }
      ]
    );
  };

  const isAdmin = user && ["karanchaudhari722@gmail.com", "karanchaudhari34804@gmail.com"].includes(user.email || "");
  const [isIngesting, setIsIngesting] = useState(false);

  const handleTriggerIngestion = async () => {
    if (isIngesting) return;
    setIsIngesting(true);
    try {
      const response = await userApi.ingestNews(); // Assuming ingestNews is in userApi now or we use raw fetch
      Alert.alert("Success", "News ingestion has been triggered.");
    } catch (error) {
      Alert.alert("Error", "Failed to trigger ingestion.");
    } finally {
      setIsIngesting(false);
    }
  };

  const stats = [
    { label: 'Streak', value: profile?.streakCount || 0, image: require('../../assets/fire.png'), color: '#F59E0B' },
    { label: 'Saved', value: profile?.savedBitesCount || 0, image: require('../../assets/savebite.png'), color: '#7C3AED' },
  ];

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.guestContainer}>
          <Ionicons name="person-circle-outline" size={100} color="#334155" />
          <Text style={styles.guestTitle}>Guest Mode</Text>
          <Text style={styles.guestSubtitle}>Sign in to sync your progress and bookmarks across devices.</Text>
          <Pressable onPress={() => navigation.navigate('Welcome')} style={styles.signInBtn}>
            <Text style={styles.signInText}>Sign In with Google</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Image 
              source={require('../../assets/back.png')} 
              style={{ width: 22, height: 22 }} 
              contentFit="contain"
            />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <Pressable onPress={() => navigation.navigate('Personalization')} style={styles.iconBtn}>
            <Image 
              source={require('../../assets/setting.png')} 
              style={{ width: 22, height: 22 }} 
              contentFit="contain"
            />
          </Pressable>
        </View>

        {/* Profile Info Card */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.profileCardWrapper}>
          <LinearGradient
            colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.95)']}
            style={styles.profileCard}
          >
            {/* Background Tech Pattern */}
            <Image 
              source={require('../../assets/grid.png')} 
              style={styles.cardPatternImage}
              contentFit="cover"
            />

            <View style={styles.avatarWrapper}>
              <View style={styles.avatarGlow} />
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} contentFit="cover" transition={500} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#FFF" />
                </View>
              )}
              <View style={styles.onlineBadge}>
                 <View style={styles.onlineInner} />
              </View>
            </View>
            
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user.displayName || 'Tech Explorer'}</Text>
                {isAdmin && <MaterialCommunityIcons name="shield-check" size={18} color="#F59E0B" style={{ marginLeft: 6 }} />}
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              
              {/* Level System */}
              <View style={styles.levelContainer}>
                <View style={styles.levelHeader}>
                  <Text style={styles.levelText}>BYTE LEVEL 12</Text>
                  <Text style={styles.xpText}>450 / 600 XP</Text>
                </View>
                <View style={styles.progressBg}>
                  <LinearGradient
                    colors={['#7C3AED', '#C084FC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: '75%' }]}
                  />
                </View>
              </View>

              <View style={[styles.badge, isAdmin && styles.adminBadge]}>
                <Image 
                  source={isAdmin ? require('../../assets/bolt.png') : require('../../assets/crown.png')} 
                  style={{ width: 14, height: 14, marginRight: 6 }} 
                  contentFit="contain"
                />
                <Text style={styles.badgeText}>{isAdmin ? 'ROOT ADMIN' : 'ELITE MEMBER'}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {stats.map((item, index) => (
            <StatCard 
              key={item.label} 
              item={item} 
              index={index} 
              onPress={item.label === 'Saved' ? () => navigation.navigate('Bookmarks') : undefined}
            />
          ))}
        </View>

        {/* Expertise / Categories Horizontal Scroll */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.expertiseSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Expertise</Text>
            <Pressable onPress={() => navigation.navigate('Personalization')}>
              <Text style={styles.editLink}>Edit Tags</Text>
            </Pressable>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.expertiseScroll}
          >
            {['AI & ML', 'React Native', 'Cybersecurity', 'Cloud Ops', 'System Design'].map((tag, i) => (
              <View key={tag} style={styles.expertiseTag}>
                <LinearGradient
                  colors={['rgba(124, 58, 237, 0.1)', 'rgba(124, 58, 237, 0.05)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.expertiseTagText}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Admin Quick Actions */}
        {isAdmin && (
          <Animated.View entering={FadeInDown.delay(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Administrator Access</Text>
            <Pressable 
              onPress={handleTriggerIngestion}
              style={({ pressed }) => [styles.adminActionCard, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={['#7C3AED', '#4C1D95']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.adminGradient}
              >
                <View style={styles.adminIconBox}>
                    <Image 
                      source={require('../../assets/bolt.png')} 
                      style={{ width: 30, height: 30 }} 
                      contentFit="contain"
                    />
                </View>
                <View style={styles.adminActionText}>
                  <Text style={styles.adminActionTitle}>Ingest Latest Bites</Text>
                  <Text style={styles.adminActionSub}>AI Processing & Content Refresh</Text>
                </View>
                {isIngesting ? <ActivityIndicator color="#FFF" /> : <Ionicons name="caret-forward" size={16} color="rgba(255,255,255,0.6)" />}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(700)} style={styles.footer}>
          <Pressable onPress={handleSignOut} style={styles.logoutBtn}>
            <Ionicons name="power-outline" size={20} color="#F87171" />
            <Text style={styles.logoutText}>End Session</Text>
          </Pressable>
          <Text style={styles.versionText}>TECHBITE OS V2.0 // BUILD 105</Text>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#F1F5F9', letterSpacing: 0.5 },
  profileCardWrapper: { paddingHorizontal: 20, marginTop: 20 },
  profileCard: {
    flexDirection: 'row',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarWrapper: { position: 'relative' },
  avatarGlow: {
    position: 'absolute',
    top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#7C3AED',
    opacity: 0.5,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#7C3AED' },
  avatarPlaceholder: { 
    width: 80, height: 80, borderRadius: 40, 
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' 
  },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: '900' },
  userInfo: { marginLeft: 20, flex: 1 },
  userName: { fontSize: 22, fontWeight: '900', color: '#F1F5F9' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  cardPatternImage: { 
    position: 'absolute', 
    top: 0, left: 0, right: 0, bottom: 0, 
    opacity: 0.08,
    borderRadius: 24 
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  levelContainer: { marginTop: 8, marginBottom: 12 },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  levelText: { color: '#7C3AED', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  xpText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  userEmail: { fontSize: 13, color: '#94A3B8', marginBottom: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  adminBadge: { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  badgeText: { color: '#7C3AED', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statPressable: {
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 18, fontWeight: '900', color: '#F1F5F9' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', marginTop: 2 },
  expertiseSection: { marginTop: 32, paddingLeft: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20, marginBottom: 16 },
  editLink: { color: '#7C3AED', fontSize: 12, fontWeight: '700' },
  expertiseScroll: { paddingRight: 20, gap: 10 },
  expertiseTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    overflow: 'hidden',
  },
  expertiseTagText: { color: '#E2E8F0', fontSize: 13, fontWeight: '700' },
  section: { paddingHorizontal: 20, marginTop: 32 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#475569', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 },
  adminActionCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.3)' },
  adminGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  adminIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminActionText: { flex: 1, marginLeft: 15 },
  adminActionTitle: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  adminActionSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  footer: { marginTop: 40, paddingHorizontal: 20, alignItems: 'center' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 20,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  logoutText: { color: '#F87171', fontWeight: '800', fontSize: 15, marginLeft: 10 },
  versionText: { marginTop: 20, fontSize: 11, color: '#475569', fontWeight: '700' },
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  guestTitle: { fontSize: 24, fontWeight: '900', color: '#F1F5F9', marginTop: 20 },
  guestSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 10, marginBottom: 30, lineHeight: 20 },
  signInBtn: {
    backgroundColor: '#7C3AED',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: 'center',
  },
  signInText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  pressed: { opacity: 0.8 },
});

