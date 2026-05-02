import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '../utils/firebase';

import WelcomeScreen from '../screens/WelcomeScreen';
import OnboardingIntroScreen from '../screens/OnboardingIntroScreen';
import InterestsSelectionScreen from '../screens/InterestsSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BiteDetailScreen from '../screens/BiteDetailScreen';
import PersonalizationScreen from '../screens/PersonalizationScreen';
import { userApi } from '../api/user';

const linking = {
  prefixes: ['techbite://', 'https://techbite.app'],
  config: {
    screens: {
      Home: 'home',
      BiteDetail: 'bite/:id',
      Profile: 'profile',
      Bookmarks: 'bookmarks',
      Welcome: 'welcome',
      OnboardingIntro: 'intro',
      Interests: 'interests',
      Personalization: 'personalization',
    },
  },
};

export type RootStackParamList = {
  Welcome: undefined;
  OnboardingIntro: undefined;
  Interests: undefined;
  Personalization: undefined;
  Home: undefined;
  Bookmarks: undefined;
  Profile: undefined;
  BiteDetail: { id: number };
};

type AppScreen = 'Welcome' | 'OnboardingIntro' | 'Interests' | 'Home' | 'Personalization';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentFlow, setCurrentFlow] = useState<AppScreen>('Welcome');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser); // Restore the user state
      if (currentUser) {
        setIsInitializing(true);
        try {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'FALLBACK';
          console.info(`[AuthSync] Handshaking with backend at: ${apiUrl}`);
          
          const res = await userApi.registerOrLogin(
            currentUser.email || '', 
            currentUser.displayName || 'Tech Explorer', 
            currentUser.photoURL || ''
          );
          console.info('[AuthSync] Handshake successful.');
          
          if (res.hasPreferences) {
            setCurrentFlow('Home');
          } else {
            setCurrentFlow('OnboardingIntro');
          }
        } catch (error) {
          console.error('[AuthSync] Backend sync failed:', error);
          setCurrentFlow('Home'); // Fallback to Home if sync fails but user is authenticated
        }
      } else {
        queryClient.removeQueries({ queryKey: ['bookmarks'] });
        queryClient.invalidateQueries({ queryKey: ['bites', 'foryou'] });
        setCurrentFlow('Welcome');
      }

      setIsInitializing(false);
    });

    return unsubscribe;
  }, [queryClient]);

  const handleSignedIn = useCallback((hasPreferences: boolean) => {
    if (hasPreferences) {
      setCurrentFlow('Home');
    } else {
      setCurrentFlow('OnboardingIntro');
    }
  }, []);

  const handleIntroComplete = useCallback(() => {
    setCurrentFlow('Interests');
  }, []);

  const handleSkip = useCallback(() => {
    setCurrentFlow('Home');
  }, []);

  const handleInterestsComplete = useCallback(async (tags: string[]) => {
    try {
      setIsInitializing(true);
      await userApi.savePreferences(tags);
      // Invalidate the query so the home screen tabs refresh
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
      setCurrentFlow('Home');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setCurrentFlow('Home');
    } finally {
      setIsInitializing(false);
    }
  }, []);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <View style={{ marginBottom: 40 }}>
          <View style={{ 
            width: 120, 
            height: 120, 
            borderRadius: 30, 
            backgroundColor: '#0F172A',
            shadowColor: '#6366F1',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 15,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <View style={{ width: 80, height: 80, backgroundColor: '#6366F1', borderRadius: 20, transform: [{ rotate: '45deg' }] }} />
          </View>
        </View>
        
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6366F1" />
          <View style={{ marginTop: 24, alignItems: 'center' }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#6366F1' }} />
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#7C3AED' }} />
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#8B5CF6' }} />
             </View>
             <View style={{ alignItems: 'center' }}>
                <View style={{ height: 1, width: 100, backgroundColor: 'rgba(99, 102, 241, 0.2)', marginBottom: 12 }} />
                <View style={{ marginBottom: 4 }}>
                   <View style={{ 
                      backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                      paddingHorizontal: 12, 
                      paddingVertical: 4, 
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(99, 102, 241, 0.2)'
                   }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                         <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1' }} />
                         <View style={{ height: 12, width: 1, backgroundColor: 'rgba(99, 102, 241, 0.3)' }} />
                         <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#7C3AED' }} />
                      </View>
                   </View>
                </View>
                <View style={{ marginTop: 8 }}>
                   <View style={{ height: 1, width: 60, backgroundColor: 'rgba(124, 58, 234, 0.15)' }} />
                </View>
             </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator 
        initialRouteName={currentFlow}
        screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}
      >
        {currentFlow === 'Welcome' && (
          <Stack.Screen name="Welcome">
            {(props) => (
              <WelcomeScreen
                {...props}
                onSkip={handleSkip}
                onSignedIn={handleSignedIn}
              />
            )}
          </Stack.Screen>
        )}

        {currentFlow === 'OnboardingIntro' && (
          <Stack.Screen name="OnboardingIntro">
            {(props) => (
              <OnboardingIntroScreen
                {...props}
                onNext={handleIntroComplete}
              />
            )}
          </Stack.Screen>
        )}

        {currentFlow === 'Interests' && (
          <Stack.Screen name="Interests">
            {(props) => (
              <InterestsSelectionScreen
                {...props}
                onComplete={handleInterestsComplete}
              />
            )}
          </Stack.Screen>
        )}


        {currentFlow === 'Home' && (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}

        <Stack.Screen name="BiteDetail" component={BiteDetailScreen} />
        
        <Stack.Screen 
          name="Personalization" 
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        >
          {(props) => (
            <PersonalizationScreen 
              onClose={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>

        {currentFlow === 'Home' && !user && (
          <Stack.Screen name="Welcome">
            {(props) => (
              <WelcomeScreen
                {...props}
                onSkip={handleSkip}
                onSignedIn={handleSignedIn}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
