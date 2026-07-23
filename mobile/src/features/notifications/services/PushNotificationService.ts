import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

export interface NotificationProvider {
  register(): Promise<string | null>;
  getToken(): Promise<string | null>;
  subscribe(callback: (notification: any) => void): () => void;
  handleNotification(notification: any): Promise<any>;
  handleResponse(response: any): void;
}

/**
 * Purpose: Provider-agnostic push notification services manager.
 * Abstracts permissions requests, tokens retrieval, and deep link routing.
 */
class ExpoPushNotificationProvider implements NotificationProvider {
  private token: string | null = null;

  async register(): Promise<string | null> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('[PushNotificationService] Push notification permissions denied.');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('techpulse-notifications', {
        name: 'TechPulse Intelligence Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: "b983c33c-0335-471b-9fe4-f7e2ff6b263f",
      });
      this.token = tokenData.data;
      return this.token;
    } catch (error: any) {
      console.warn('[PushNotificationService] Push tokens unavailable in dev environment (Native FCM credentials pending):', error?.message || error);
      return null;
    }
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    return this.register();
  }

  subscribe(callback: (notification: any) => void): () => void {
    const receiveSubscription = Notifications.addNotificationReceivedListener((notification) => {
      callback(notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      this.handleResponse(response);
    });

    return () => {
      receiveSubscription.remove();
      responseSubscription.remove();
    };
  }

  async handleNotification(notification: any): Promise<any> {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  }

  handleResponse(response: any): void {
    const data = response.notification.request.content.data;
    if (!data) return;

    // Handle deep links correctly: event, technology, notifications, settings
    const route = data.route;
    const parameter = data.id || data.name;

    if (route) {
      const targetUrl = parameter ? `techpulse://${route}/${parameter}` : `techpulse://${route}`;
      Linking.openURL(targetUrl).catch(err => {
        console.warn('[PushNotificationService] Failed to redirect to deep link target:', err);
      });
    }
  }
}

export const PushNotificationService = new ExpoPushNotificationProvider();
