import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../utils/firebase';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ProfileScreen({ navigation }: any) {
  const user = auth.currentUser;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);

  const toggleSettings = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSettingsOpen(!isSettingsOpen);
  };

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
              try { await GoogleSignin.signOut(); } catch (e) {}
              await signOut(auth);
            } catch (error) {
              Alert.alert("Error", "Failed to sign out.");
            }
          }
        }
      ]
    );
  };

  const isAdmin = user && ["karanchaudhari722@gmail.com", "karanchaudhari34804@gmail.com"].includes(user.email || "");

  const handleTriggerIngestion = async () => {
    if (isIngesting) return;
    setIsIngesting(true);
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/bites/admin/news/ingest`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      if (response.ok) {
        Alert.alert("Success", "News ingestion triggered.");
      } else {
        Alert.alert("Error", "Failed to trigger ingestion.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Could not connect to backend.");
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Top Header Logo */}
        <View style={styles.topLogoRow}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/app_icon.png')} 
              style={styles.logoIcon}
            />
            <Text style={styles.logoText}>TechBite</Text>
          </View>
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Promo Banner */}
        <LinearGradient
          colors={['#1E1B4B', '#312E81']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.promoBanner}
        >
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Try the <Text style={{color: '#818CF8'}}>Widget</Text> with Digest Overview!</Text>
            <Pressable style={styles.addNowBtn}>
              <Text style={styles.addNowText}>+ Add now</Text>
            </Pressable>
          </View>
          <Image source={require('../../assets/fire.png')} style={styles.promoIcon} contentFit="contain" />
        </LinearGradient>

        {/* User Info Section */}
        <View style={styles.userInfoRow}>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.displayName || 'Karan Chaudhari'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'karanchaudhari722@gmail.com'}</Text>
          </View>
          <View style={styles.avatarWrap}>
             {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
             ) : (
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{user?.displayName?.charAt(0) || 'K'}</Text>
                </View>
             )}
          </View>
        </View>

        {/* Action Grid */}
        <View style={styles.gridRow}>
          <Pressable style={styles.gridCard}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Daily{"\n"}Digest</Text>
              <Text style={styles.cardValue}>28 left</Text>
            </View>
            <View style={styles.cardIconWrap}>
               <Image source={require('../../assets/save.png')} style={styles.cardImg} />
            </View>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Bookmarks')} style={styles.gridCard}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Your{"\n"}Activity</Text>
              <Text style={styles.cardSub}>Likes & Saves</Text>
            </View>
            <View style={styles.cardIconWrap}>
               <Image source={require('../../assets/fire.png')} style={styles.cardImg} />
            </View>
          </Pressable>
        </View>

        {/* Menu Items */}
        <Pressable onPress={() => navigation.navigate('Interests')} style={styles.menuCard}>
            <View style={styles.menuLeft}>
                <Text style={styles.menuTitle}>Personalize your Feed</Text>
                <Text style={styles.menuSub}>topics</Text>
            </View>
            <View style={styles.topPickBadge}>
                <Text style={styles.topPickText}>✨ Top picks</Text>
            </View>
        </Pressable>

        <Pressable style={styles.menuCard}>
            <View style={styles.menuLeft}>
                <Text style={styles.menuTitle}>Invite and Earn</Text>
                <Text style={styles.menuSub}>You will earn rewards.</Text>
            </View>
            <View style={styles.iconCircle}>
                <Ionicons name="trophy" size={20} color="#FBBF24" />
            </View>
        </Pressable>

        {/* Locked Feature Card */}
        <View style={styles.lockedCard}>
            <View style={styles.lockIconBox}>
                <Ionicons name="lock-closed" size={24} color="#94A3B8" />
            </View>
            <Text style={styles.lockedText}>
                Complete a 7-day streak in Daily Digest to unlock the <Text style={{color: '#F1F5F9'}}>Resume Booster</Text> tool.
            </Text>
        </View>

        {/* Admin Dashboard (Internal Only) */}
        {isAdmin && (
            <Pressable 
                onPress={handleTriggerIngestion}
                style={styles.adminActionCard}
            >
                <LinearGradient
                    colors={['#4338CA', '#3730A3']}
                    style={styles.adminGradient}
                >
                    <Ionicons name="flash" size={20} color="#FFF" />
                    <Text style={styles.adminText}>
                        {isIngesting ? 'Syncing Feeds...' : 'Trigger News Ingestion Engine'}
                    </Text>
                </LinearGradient>
            </Pressable>
        )}

        {/* Settings Accordion */}
        <View style={styles.settingsContainer}>
            <Pressable onPress={toggleSettings} style={styles.settingsHeader}>
                <Text style={styles.settingsTitle}>Settings & Support</Text>
                <Ionicons name={isSettingsOpen ? "chevron-up" : "chevron-down"} size={20} color="#94A3B8" />
            </Pressable>
            
            {isSettingsOpen && (
                <View style={styles.settingsContent}>
                    <Pressable style={styles.settingItem}>
                        <Ionicons name="notifications-outline" size={20} color="#94A3B8" />
                        <Text style={styles.settingLabel}>Notifications</Text>
                    </Pressable>
                    <Pressable style={styles.settingItem}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#94A3B8" />
                        <Text style={styles.settingLabel}>Privacy Policy</Text>
                    </Pressable>
                    <Pressable onPress={handleSignOut} style={[styles.settingItem, { borderBottomWidth: 0 }]}>
                        <Ionicons name="log-out-outline" size={20} color="#F87171" />
                        <Text style={[styles.settingLabel, { color: '#F87171' }]}>Sign Out</Text>
                    </Pressable>
                </View>
            )}
        </View>

        <Text style={styles.versionText}>TechBite v1.2.0 • Premium Edition</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  topLogoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: { width: 32, height: 32, borderRadius: 8 },
  logoText: { fontSize: 20, fontWeight: '900', color: '#F1F5F9', letterSpacing: -0.5 },
  
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  promoContent: { flex: 1, gap: 12 },
  promoTitle: { fontSize: 16, fontWeight: '700', color: '#F1F5F9', lineHeight: 22 },
  addNowBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  addNowText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  promoIcon: { width: 60, height: 60, opacity: 0.8 },

  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  userDetails: { flex: 1 },
  userName: { fontSize: 28, fontWeight: '900', color: '#F1F5F9', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  avatarWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1E293B', padding: 2 },
  avatar: { width: '100%', height: '100%', borderRadius: 32 },
  avatarPlaceholder: { 
    width: '100%', height: '100%', borderRadius: 32, 
    backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' 
  },
  avatarInitial: { color: '#94A3B8', fontSize: 24, fontWeight: '800' },

  gridRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  gridCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  cardInfo: { justifyContent: 'space-between' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#F1F5F9', lineHeight: 24 },
  cardValue: { fontSize: 14, color: '#818CF8', fontWeight: '700' },
  cardSub: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  cardIconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cardImg: { width: 32, height: 32 },

  menuCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  menuLeft: { gap: 4 },
  menuTitle: { fontSize: 18, fontWeight: '800', color: '#F1F5F9' },
  menuSub: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  topPickBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topPickText: { color: '#FDE047', fontSize: 12, fontWeight: '800' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockedCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
    opacity: 0.8,
  },
  lockIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: { flex: 1, fontSize: 14, color: '#94A3B8', fontWeight: '600', lineHeight: 20 },

  adminActionCard: { marginBottom: 24, borderRadius: 20, overflow: 'hidden' },
  adminGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  adminText: { color: '#FFF', fontWeight: '900', fontSize: 14 },

  settingsContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    marginBottom: 32,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  settingsTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9' },
  settingsContent: { paddingHorizontal: 20, paddingBottom: 10 },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  versionText: { textAlign: 'center', color: '#334155', fontSize: 12, fontWeight: '800', marginBottom: 20 },
});
