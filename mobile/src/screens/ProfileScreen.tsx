import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { signOut } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../utils/firebase';

export default function ProfileScreen({ navigation }: any) {
  const user = auth.currentUser;

  React.useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    });
  }, []);

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
              // Sign out from Google (non-blocking)
              try {
                await GoogleSignin.signOut();
              } catch (e) {
                console.log("Google sign out info:", e);
              }
              
              // Sign out from Firebase
              await signOut(auth);
              
              // Navigation is handled automatically by AppNavigator's onAuthStateChanged
            } catch (error) {
              console.error("Sign out error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        }
      ]
    );
  };

  const isAdmin = user && ["karanchaudhari722@gmail.com", "karanchaudhari34804@gmail.com"].includes(user.email || "");
  const [isIngesting, setIsIngesting] = React.useState(false);

  const handleTriggerIngestion = async () => {
    if (isIngesting) return;
    
    setIsIngesting(true);
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/bites/admin/news/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        Alert.alert("Success", "News ingestion has been triggered in the background.");
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Failed to trigger ingestion. Are you an admin?");
      }
    } catch (error) {
      console.error("Ingestion error:", error);
      Alert.alert("Network Error", "Could not connect to the backend server.");
    } finally {
      setIsIngesting(false);
    }
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
            <Text style={styles.badgeText}>{isAdmin ? 'SYSTEM ADMINISTRATOR' : (user ? 'PREMIUM MEMBER' : 'GUEST MODE')}</Text>
          </View>
        </View>

        {/* Admin Section (Only for you) */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Dashboard</Text>
            
            <Pressable 
              onPress={handleTriggerIngestion}
              disabled={isIngesting}
              style={({ pressed }) => [
                styles.adminBtn, 
                pressed && styles.pressed,
                isIngesting && { opacity: 0.5 }
              ]}
            >
              <Text style={styles.adminEmoji}>⚡</Text>
              <Text style={styles.adminBtnText}>
                {isIngesting ? 'Activating Engine...' : 'Trigger News Ingestion'}
              </Text>
            </Pressable>
            <Text style={styles.adminSubtext}>This will fetch RSS feeds and generate AI summaries immediately.</Text>
          </View>
        )}

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
          
          <Text style={styles.version}>TechBite v1.1.0 (Admin Edition)</Text>
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
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#7C3AED',
    marginBottom: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  adminEmoji: { fontSize: 20, marginRight: 16 },
  adminBtnText: { flex: 1, fontSize: 16, fontWeight: '900', color: '#7C3AED' },
  adminSubtext: { fontSize: 11, color: '#64748B', fontWeight: '600', paddingHorizontal: 4, marginBottom: 20 },
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

