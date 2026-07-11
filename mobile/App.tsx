import './global.css';
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { NotificationService } from './src/utils/NotificationService';
import { store, persistor } from './src/store';
import BootstrapScreen from './src/screens/BootstrapScreen';

import { LogBox } from 'react-native';

// Ignore specific internal library warnings for a cleaner console
LogBox.ignoreLogs([
  '[Reanimated] Reading from `value` during component render',
  '[Reanimated] Writing to `value` during component render',
  'Cannot record touch end without a touch start',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export default function App() {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
    });

    // Request Notification Permissions
    NotificationService.requestPermissions().catch(err => {
      console.warn('[Notifications] Failed to request permissions:', err);
    });
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {isBootstrapped ? (
          <PersistQueryClientProvider 
            client={queryClient}
            persistOptions={{ persister: asyncStoragePersister }}
          >
            <AppNavigator />
            <StatusBar style="light" />
          </PersistQueryClientProvider>
        ) : (
          <BootstrapScreen onComplete={() => setIsBootstrapped(true)} />
        )}
      </PersistGate>
    </Provider>
  );
}

