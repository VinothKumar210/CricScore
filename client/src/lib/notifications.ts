// Push Notification Management Utilities
import { registerServiceWorker } from "@/sw-register";

// VAPID public key - In production, this should be from environment variables
// For now, using a placeholder that would be replaced with actual VAPID key
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || 'BPLyN3_LPBPyFVWkjWE6LPcvXfD-Y3-8-yKF2Hy_-QV4DjT5SH3YzU2F-9-ztAeVjXlT3FnGztCYcOQF2nO9XPw';

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Check current notification permission status
export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  // If already granted or denied, return current status
  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  
  return permission;
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (): Promise<PushSubscription | null> => {
  try {
    // First request notification permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('Service worker registration failed');
    }

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      console.log('Already subscribed to push notifications');
      return subscription;
    }

    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('Successfully subscribed to push notifications');
    return subscription;

  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('No push subscription found');
      return true;
    }

    const successful = await subscription.unsubscribe();
    console.log('Successfully unsubscribed from push notifications');
    return successful;

  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
};

// Get current push subscription
export const getCurrentPushSubscription = async (): Promise<PushSubscription | null> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
};

// Send subscription to server
export const sendSubscriptionToServer = async (subscription: PushSubscription, username: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        subscription,
        username
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }

    console.log('Subscription sent to server successfully');
    return true;

  } catch (error) {
    console.error('Error sending subscription to server:', error);
    return false;
  }
};

// Remove subscription from server
export const removeSubscriptionFromServer = async (username: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server');
    }

    console.log('Subscription removed from server successfully');
    return true;

  } catch (error) {
    console.error('Error removing subscription from server:', error);
    return false;
  }
};

// Show a local notification (for testing)
export const showLocalNotification = async (title: string, options?: NotificationOptions): Promise<void> => {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const defaultOptions: NotificationOptions = {
    body: 'This is a test notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'test-notification',
    requireInteraction: false,
    silent: false,
  };

  new Notification(title, { ...defaultOptions, ...options });
};

// Initialize notifications for a user
export const initializeNotifications = async (username: string): Promise<boolean> => {
  try {
    if (!isNotificationSupported()) {
      console.log('Notifications not supported');
      return false;
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    const subscription = await subscribeToPushNotifications();
    if (!subscription) {
      console.log('Failed to subscribe to push notifications');
      return false;
    }

    const serverSuccess = await sendSubscriptionToServer(subscription, username);
    if (!serverSuccess) {
      console.log('Failed to send subscription to server');
      return false;
    }

    console.log('Notifications initialized successfully');
    return true;

  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
};

// Cleanup notifications for a user
export const cleanupNotifications = async (username: string): Promise<boolean> => {
  try {
    const unsubscribed = await unsubscribeFromPushNotifications();
    const serverRemoved = await removeSubscriptionFromServer(username);
    
    return unsubscribed && serverRemoved;
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    return false;
  }
};