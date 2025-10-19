import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

interface UpdateNotificationProps {
  registration: ServiceWorkerRegistration | null;
}

export function UpdateNotification({ registration }: UpdateNotificationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (registration) {
      setShow(true);
    }
  }, [registration]);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 bg-card border rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom-5"
      data-testid="notification-update"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Update Available</h3>
          <p className="text-sm text-muted-foreground mb-3">
            A new version of the app is available. Refresh to update.
          </p>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleUpdate}
              data-testid="button-update"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Now
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDismiss}
              data-testid="button-dismiss-update"
            >
              <X className="w-4 h-4 mr-2" />
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OfflineNotificationProps {
  show: boolean;
}

export function OfflineNotification({ show }: OfflineNotificationProps) {
  if (!show) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-50 bg-card border rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-top-5"
      data-testid="notification-offline"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Offline Mode</h3>
          <p className="text-sm text-muted-foreground">
            App is ready to work offline. Your data is cached locally.
          </p>
        </div>
      </div>
    </div>
  );
}
