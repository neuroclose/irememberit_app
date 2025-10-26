import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiService } from './api.service';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private pushToken: string | null = null;

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if physical device
      if (!Device.isDevice) {
        console.log('[PushNotifications] Not a physical device, skipping push registration');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[PushNotifications] Permission not granted');
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Will be auto-configured by Expo
      });

      this.pushToken = tokenData.data;
      console.log('[PushNotifications] Token obtained:', this.pushToken);

      // Register token with backend
      await this.registerTokenWithBackend(this.pushToken);

      return this.pushToken;
    } catch (error) {
      console.error('[PushNotifications] Error registering:', error);
      return null;
    }
  }

  /**
   * Register token with backend
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      await apiService.registerPushToken(token);
      console.log('[PushNotifications] Token registered with backend');
    } catch (error) {
      console.error('[PushNotifications] Failed to register token with backend:', error);
    }
  }

  /**
   * Unregister push token (call on logout)
   */
  async unregisterPushToken(): Promise<void> {
    try {
      if (!this.pushToken) {
        console.log('[PushNotifications] No token to unregister');
        return;
      }

      await apiService.deletePushToken(this.pushToken);
      console.log('[PushNotifications] Token unregistered from backend');
      this.pushToken = null;
    } catch (error) {
      console.error('[PushNotifications] Failed to unregister token:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
  ) {
    // Notification received while app is foregrounded
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[PushNotifications] Notification received:', notification);
      onNotificationReceived?.(notification);
    });

    // Notification tapped
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[PushNotifications] Notification tapped:', response);
      onNotificationTapped?.(response);
    });

    return () => {
      receivedListener.remove();
      responseListener.remove();
    };
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }
}

export const pushNotificationService = new PushNotificationService();
