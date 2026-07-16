import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BiteDetailScreen from '../screens/BiteDetailScreen';
import EventDetailScreen from '../features/events/screens/EventDetailScreen';
import SearchScreen from '../features/search/screens/SearchScreen';
import PersonalizationScreen from '../screens/PersonalizationScreen';
import ArticleScreen from '../screens/ArticleScreen';
import LibraryScreen from '../features/personalization/screens/LibraryScreen';
import CollectionsScreen from '../features/personalization/screens/CollectionsScreen';
import CollectionDetailScreen from '../features/personalization/screens/CollectionDetailScreen';
import ReadingHistoryScreen from '../features/personalization/screens/ReadingHistoryScreen';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import NotificationSettingsScreen from '../features/notifications/screens/NotificationSettingsScreen';
import TechnologyFollowingScreen from '../features/notifications/screens/TechnologyFollowingScreen';
import RecommendationCenterScreen from '../features/notifications/screens/RecommendationCenterScreen';
import AssistantScreen from '../features/assistant/screens/AssistantScreen';
import ConversationHistoryScreen from '../features/assistant/screens/ConversationHistoryScreen';
import SystemSettingsScreen from '../features/system/screens/SystemSettingsScreen';
import TechnologyScreen from '../features/intelligence/screens/TechnologyScreen';
import CompanyScreen from '../features/intelligence/screens/CompanyScreen';
import ReleaseScreen from '../features/intelligence/screens/ReleaseScreen';
import TimelineScreen from '../features/intelligence/screens/TimelineScreen';
import KnowledgeGraphScreen from '../features/intelligence/screens/KnowledgeGraphScreen';
import WorkspaceScreen from '../features/intelligence/screens/WorkspaceScreen';

const linking = {
  prefixes: ['techpulse://', 'https://techpulse.onrender.com'],

  config: {
    screens: {
      Home: 'home',
      BiteDetail: 'bite/:id',
      EventDetail: 'event/:id',
      Search: 'search',
      Profile: 'profile',
      Bookmarks: 'bookmarks',
      Library: 'library',
      Collections: 'collections',
      CollectionDetail: 'collection/:id',
      ReadingHistory: 'history',
      Notifications: 'notifications',
      NotificationSettings: 'notification-settings',
      TechnologyFollowing: 'technology-following',
      RecommendationCenter: 'recommendations',
      Assistant: 'assistant',
      ConversationHistory: 'conversation-history',
      SystemSettings: 'settings',
      Technology: 'technology/:id',
      Company: 'company/:id',
      Release: 'release/:id',
      Timeline: 'timeline/:id',
      KnowledgeGraph: 'graph',
      Workspace: 'workspace',
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
  EventDetail: { id: string };
  Search: undefined;
  Library: undefined;
  Collections: undefined;
  CollectionDetail: { id: string };
  ReadingHistory: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  TechnologyFollowing: undefined;
  RecommendationCenter: undefined;
  Assistant: undefined;
  ConversationHistory: undefined;
  SystemSettings: undefined;
  Technology: { id: string };
  Company: { id: string };
  Release: { id: string };
  Timeline: { id: string };
  KnowledgeGraph: undefined;
  Workspace: undefined;
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
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="Collections" component={CollectionsScreen} />
        <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
        <Stack.Screen name="ReadingHistory" component={ReadingHistoryScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="TechnologyFollowing" component={TechnologyFollowingScreen} />
        <Stack.Screen name="RecommendationCenter" component={RecommendationCenterScreen} />
        <Stack.Screen name="Assistant" component={AssistantScreen} />
        <Stack.Screen name="ConversationHistory" component={ConversationHistoryScreen} />
        <Stack.Screen name="SystemSettings" component={SystemSettingsScreen} />
        <Stack.Screen name="Technology" component={TechnologyScreen} />
        <Stack.Screen name="Company" component={CompanyScreen} />
        <Stack.Screen name="Release" component={ReleaseScreen} />
        <Stack.Screen name="Timeline" component={TimelineScreen} />
        <Stack.Screen name="KnowledgeGraph" component={KnowledgeGraphScreen} />
        <Stack.Screen name="Workspace" component={WorkspaceScreen} />
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

