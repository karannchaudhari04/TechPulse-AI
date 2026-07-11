import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BiteDetailScreen from '../screens/BiteDetailScreen';
import PersonalizationScreen from '../screens/PersonalizationScreen';
import ArticleScreen from '../screens/ArticleScreen';

const linking = {
  prefixes: ['techpulse://', 'https://techpulse.onrender.com'],

  config: {
    screens: {
      Home: 'home',
      BiteDetail: 'bite/:id',
      Profile: 'profile',
      Bookmarks: 'bookmarks',
      Personalization: 'personalization',
      Article: 'article',
    },
  },
};

export type RootStackParamList = {
  Home: undefined;
  Bookmarks: undefined;
  Profile: undefined;
  BiteDetail: { id: number };
  Article: { url: string; title: string };
  Personalization: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Purpose: Main Application stack navigator (rendered once verified/authenticated).
 */
export default function AppNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="BiteDetail" component={BiteDetailScreen} />
        <Stack.Screen name="Article" component={ArticleScreen} options={{ animation: 'slide_from_right' }} />
        
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

