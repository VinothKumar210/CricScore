import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, X } from "lucide-react";
import { useNotifications } from "@/lib/notifications";

interface NotificationPermissionProps {
  onDismiss?: () => void;
  className?: string;
}

export function NotificationPermission({ onDismiss, className }: NotificationPermissionProps) {
  const { permission, isSupported, requestPermission, shouldRequestPermission } = useNotifications();
  const [isRequesting, setIsRequesting] = useState(false);

  // Don't show if notifications aren't supported or already granted/denied
  if (!isSupported || !shouldRequestPermission) {
    return null;
  }

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await requestPermission();
      if (result === 'granted') {
        // Permission granted, component will hide automatically
        onDismiss?.();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card className={className} data-testid="notification-permission-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Enable Notifications</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              data-testid="button-dismiss-notification"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Get notified when matches you're spectating start or have important updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Match start alerts</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Score updates</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span>Important moments</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="flex-1"
            data-testid="button-enable-notifications"
          >
            <Bell className="h-4 w-4 mr-2" />
            {isRequesting ? "Requesting..." : "Enable Notifications"}
          </Button>
          
          {onDismiss && (
            <Button 
              variant="outline" 
              onClick={onDismiss}
              data-testid="button-maybe-later"
            >
              <BellOff className="h-4 w-4 mr-2" />
              Maybe Later
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to manage notification permission state in components
export function useNotificationPermissionState() {
  const [dismissed, setDismissed] = useState(false);
  const { shouldRequestPermission, permission } = useNotifications();

  // Show the permission request if:
  // 1. Not dismissed by user
  // 2. Should request permission (supported and permission is 'default')
  const shouldShow = !dismissed && shouldRequestPermission;

  const dismiss = () => setDismissed(true);

  return {
    shouldShow,
    dismiss,
    permission,
  };
}