import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '../utils/firebase';

import WelcomeScreen from '../screens/WelcomeScreen';
import InterestsSelectionScreen from '../screens/InterestsSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BiteDetailScreen from '../screens/BiteDetailScreen';

const linking = {
  prefixes: ['techbite://', 'https://techbite.app'],
  config: {
    screens: {
      Home: 'home',
      BiteDetail: 'bite/:id',
      Profile: 'profile',
      Bookmarks: 'bookmarks',
      Welcome: 'welcome',
    },
  },
};

export type RootStackParamList = {
  Welcome: undefined;
  Interests: undefined;
  Home: undefined;
  Bookmarks: undefined;
  Profile: undefined;
  BiteDetail: { id: number };
};

type AppScreen = 'Welcome' | 'Interests' | 'Home';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  // Controls which top-level screen we're on
  const [currentFlow, setCurrentFlow] = useState<AppScreen>('Welcome');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // User is signed in — go to Home (Interests was handled in WelcomeScreen callback)
        // If they were already signed in before app restarted, also go straight to Home
        setCurrentFlow('Home');
      } else {
        // Signed out — clear all cached data so next user sees a clean state
        queryClient.removeQueries({ queryKey: ['bookmarks'] });
        queryClient.invalidateQueries({ queryKey: ['bites', 'foryou'] });
        setCurrentFlow('Welcome');
      }

      setIsInitializing(false);
    });

    return unsubscribe;
  }, [queryClient]);

  /** Called by WelcomeScreen after a successful sign-in + backend upsert. */
  const handleSignedIn = useCallback((hasPreferences: boolean) => {
    if (hasPreferences) {
      setCurrentFlow('Home');
    } else {
      setCurrentFlow('Interests');
    }
  }, []);

  /** Called when user taps Skip on WelcomeScreen. */
  const handleSkip = useCallback(() => {
    setCurrentFlow('Home');
  }, []);

  /** Called by InterestsSelectionScreen after preferences are saved. */
  const handleInterestsComplete = useCallback(() => {
    setCurrentFlow('Home');
  }, []);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="BiteDetail" component={BiteDetailScreen} />
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
            {/* Welcome reachable from Profile if user is a guest */}
            {!user && (
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
