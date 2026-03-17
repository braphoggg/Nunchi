"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Tracks browser online/offline status.
 * Returns `isOnline` boolean and a `lastOfflineAt` timestamp for banner logic.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Auto-dismiss "back online" after 3 seconds
      setTimeout(() => setWasOffline(false), 3000);
    };
    const goOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const dismissReconnected = useCallback(() => setWasOffline(false), []);

  return { isOnline, wasOffline, dismissReconnected };
}
