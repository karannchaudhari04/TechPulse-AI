import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationService = {
  /**
   * Request permissions, initialize notifications, and retrieve push token
   */
  async requestPermissions(): Promise<string | null> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted!');
      return null;
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('daily-digest', {
        name: 'Daily CS Digest',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: "b983c33c-0335-471b-9fe4-f7e2ff6b263f"
      });
      return tokenData.data;
    } catch (error) {
      console.error('[Notifications] Failed to get Expo push token:', error);
      return null;
    }
  }
};
