import './global.css';
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { store, persistor } from './src/store';
import { ThemeProvider } from './src/theme';

import { LogBox } from 'react-native';

// Ignore specific internal library warnings for a cleaner console
LogBox.ignoreLogs([
  '[Reanimated] Reading from `value` during component render',
  '[Reanimated] Writing to `value` during component render',
  'Cannot record touch end without a touch start',
]);

import { OfflineQueueService } from './src/features/personalization/services/OfflineQueueService';
import { PushNotificationService } from './src/features/notifications/services/PushNotificationService';
import { NotificationSyncService } from './src/features/notifications/services/NotificationSyncService';
import { ENV } from './src/config/env';

export default function App() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: ENV.GOOGLE.WEB_CLIENT_ID,
      iosClientId: ENV.GOOGLE.IOS_CLIENT_ID,
      offlineAccess: true,
    });

    // Initialize Push Notifications permissions & configurations
    PushNotificationService.register().catch(err => {
      console.warn('[Notifications] Failed to initialize push:', err);
    });

    // Subscribe to notification foreground receiver streams
    const unsubscribePush = PushNotificationService.subscribe((notification) => {
      console.info('[Notifications] Push received in foreground:', notification);
    });

    // Start background sync manager
    NotificationSyncService.initialize();

    // Start offline queue monitoring
    OfflineQueueService.startAutoReplay();

    return () => {
      unsubscribePush();
      NotificationSyncService.shutdown();
    };
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

