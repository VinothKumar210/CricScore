// Simple notification utility for PWA notifications
export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
}

class NotificationService {
  public isSupported: boolean = false;
  public permission: NotificationPermission = 'default';

  constructor() {
    this.isSupported = 'Notification' in window;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  // Check if notifications are supported and permitted
  get canNotify(): boolean {
    return this.isSupported && this.permission === 'granted';
  }

  // Request permission for notifications
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission;
  }

  // Show a notification
  async showNotification(data: NotificationData): Promise<void> {
    // Request permission if not already granted
    if (this.permission !== 'granted') {
      await this.requestPermission();
    }

    if (!this.canNotify) {
      console.warn('Notifications not supported or permission denied');
      return;
    }

    try {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/icon-192x192.png',
        data: data.data,
        tag: data.tag,
        requireInteraction: true, // Keep notification visible until user interacts
      });

      // Auto-close after 10 seconds if not interacted with
      setTimeout(() => {
        notification.close();
      }, 10000);

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        notification.close();
        
        // Focus window and navigate to match if data contains match ID
        window.focus();
        if (data.data?.matchId) {
          window.location.href = `/match-view/${data.data.matchId}`;
        }
      };

    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Show match start notification
  async notifyMatchStart(matchName: string, venue: string, matchId: string): Promise<void> {
    await this.showNotification({
      title: '🏏 Match Starting Soon!',
      body: `${matchName} at ${venue} is about to begin`,
      tag: `match-start-${matchId}`,
      data: { 
        type: 'match-start',
        matchId 
      }
    });
  }

  // Show match update notification
  async notifyMatchUpdate(matchName: string, update: string, matchId: string): Promise<void> {
    await this.showNotification({
      title: `🏏 ${matchName}`,
      body: update,
      tag: `match-update-${matchId}`,
      data: { 
        type: 'match-update',
        matchId 
      }
    });
  }

  // Check if we should show permission request
  shouldRequestPermission(): boolean {
    return this.isSupported && this.permission === 'default';
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Hook for React components
import { useState, useEffect } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(notificationService.permission);
  const [isSupported] = useState(notificationService.isSupported);

  useEffect(() => {
    // Update permission state if it changes
    const checkPermission = () => {
      if (notificationService.permission !== permission) {
        setPermission(notificationService.permission);
      }
    };

    // Check periodically in case permission changes
    const interval = setInterval(checkPermission, 1000);
    return () => clearInterval(interval);
  }, [permission]);

  const requestPermission = async () => {
    const newPermission = await notificationService.requestPermission();
    setPermission(newPermission);
    return newPermission;
  };

  return {
    permission,
    isSupported,
    canNotify: notificationService.canNotify,
    requestPermission,
    showNotification: notificationService.showNotification.bind(notificationService),
    notifyMatchStart: notificationService.notifyMatchStart.bind(notificationService),
    notifyMatchUpdate: notificationService.notifyMatchUpdate.bind(notificationService),
    shouldRequestPermission: notificationService.shouldRequestPermission(),
  };
}