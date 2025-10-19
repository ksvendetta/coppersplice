import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import { UpdateNotification, OfflineNotification } from "@/components/UpdateNotification";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const handleSwUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorkerRegistration>;
      setSwRegistration(customEvent.detail);
    };

    const handleOfflineReady = () => {
      setShowOffline(true);
      setTimeout(() => setShowOffline(false), 5000);
    };

    window.addEventListener('swUpdate', handleSwUpdate);
    window.addEventListener('swOfflineReady', handleOfflineReady);

    return () => {
      window.removeEventListener('swUpdate', handleSwUpdate);
      window.removeEventListener('swOfflineReady', handleOfflineReady);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <UpdateNotification registration={swRegistration} />
        <OfflineNotification show={showOffline} />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
