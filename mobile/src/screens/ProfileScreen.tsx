import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { signOut } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../utils/firebase';

export default function ProfileScreen({ navigation }: any) {
  const user = auth.currentUser;

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
              // Revoke Google access so the account picker shows on next sign-in
              await GoogleSignin.revokeAccess();
              await signOut(auth);
              // AppNavigator's onAuthStateChanged handles the navigation + cache clear
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleGoToLogin = () => {
    // Navigate to Welcome screen to sign in
    navigation.navigate('Welcome');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Header with Back Button */}
        <View style={styles.header}>
          <Pressable 
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Account</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image 
                source={{ uri: user.photoURL }} 
                style={styles.avatar}
                contentFit="cover"
                transition={500}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'G'}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.name}>{user?.displayName || 'Guest Browser'}</Text>
          <Text style={styles.email}>{user?.email || 'Login to save your bookmarks'}</Text>
          
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{user ? 'PREMIUM MEMBER' : 'GUEST MODE'}</Text>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.menuItem}>
            <Text style={styles.menuEmoji}>🔔</Text>
            <Text style={styles.menuLabel}>Push Notifications</Text>
            <Text style={styles.menuValue}>On</Text>
          </View>

          <View style={styles.menuItem}>
            <Text style={styles.menuEmoji}>🌙</Text>
            <Text style={styles.menuLabel}>Dark Mode</Text>
            <Text style={styles.menuValue}>System</Text>
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {user ? (
            <Pressable 
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          ) : (
            <Pressable 
              onPress={handleGoToLogin}
              style={({ pressed }) => [styles.signInBtn, pressed && styles.pressed]}
            >
              <Text style={styles.signInText}>Sign In with Google</Text>
            </Pressable>
          )}
          
          <Text style={styles.version}>TechBite v1.0.0 (Beta)</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { flexGrow: 1, paddingBottom: 40, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  backText: { fontSize: 20, color: '#F1F5F9' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#F1F5F9' },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#1E293B',
    marginHorizontal: 24,
    marginTop: 28,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#7C3AED' },
  avatarPlaceholder: { 
    width: 120, height: 120, borderRadius: 60, 
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#6D28D9'
  },
  avatarText: { color: '#FFFFFF', fontSize: 40, fontWeight: '900' },
  name: { fontSize: 24, fontWeight: '900', color: '#F1F5F9', marginBottom: 4 },
  email: { fontSize: 14, color: '#94A3B8', fontWeight: '500', marginBottom: 20 },
  badge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  section: { paddingHorizontal: 24, marginTop: 32 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  menuEmoji: { fontSize: 18, marginRight: 16 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#E2E8F0' },
  menuValue: { fontSize: 14, color: '#7C3AED', fontWeight: 'bold' },
  footer: { paddingHorizontal: 24, marginTop: 'auto', paddingTop: 40, alignItems: 'center' },
  signOutBtn: {
    width: '100%',
    backgroundColor: '#1E293B',
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  signOutText: { color: '#F87171', fontWeight: '900', fontSize: 16 },
  signInBtn: {
    width: '100%',
    backgroundColor: '#7C3AED',
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  version: { marginTop: 20, color: '#475569', fontSize: 12, fontWeight: 'bold' },
  pressed: { opacity: 0.7 }
});

