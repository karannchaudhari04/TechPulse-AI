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
   * Request permissions and initialize notifications
   */
  async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted!');
      return false;
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('daily-digest', {
        name: 'Daily CS Digest',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    return true;
  },

  /**
   * Schedule the daily reminder
   */
  async scheduleDailyReminder() {
    // Clear any existing reminders first
    await Notifications.cancelAllScheduledNotificationsAsync();

    const title = "🏜️ Your Daily CS Digest is ready";
    const body = "Master today's high-yield tech bites in just 2 minutes.";

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: { screen: 'Home' },
        sound: true,
      },
      trigger: {
        hour: 9, // 9:00 AM
        minute: 0,
        repeats: true,
      } as any,
    });
    
    console.info('[Notifications] Daily reminder scheduled for 9:00 AM');
  }
};
