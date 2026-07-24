"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { notificationService } from "@/src/services/notificationService";
import { authService } from "@/src/services/authService";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface OverlayNotification {
  id: string;
  title: string;
  body: string;
  payload?: any;
}

interface NotificationContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  overlayNotification: OverlayNotification | null;
  dismissOverlay: () => void;
  onNotificationRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  overlayNotification: null,
  dismissOverlay: () => {},
  onNotificationRead: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [overlayNotification, setOverlayNotification] = useState<OverlayNotification | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.unreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  }, []);

  const onNotificationRead = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const dismissOverlay = useCallback(() => {
    setOverlayNotification(null);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const setupPush = async () => {
      try {
        const profile = await authService.getCurrentProfile();
        if (!profile) return; // Only register if authenticated

        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const publicVapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
        if (!publicVapidKey) return;

        if (Notification.permission === 'denied') return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
           subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
          });
        }

        const subJson = subscription.toJSON();
        if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
          await notificationService.registerPushSubscription({
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          }, navigator.userAgent);
        }
      } catch (err) {
        console.error("Failed to register push subscription:", err);
      }
    };

    setupPush();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "NEW_NOTIFICATION") {
        const payload = event.data.payload;
        setOverlayNotification({
          id: Math.random().toString(36).slice(2, 9),
          title: payload.title || "New Notification",
          body: payload.body || "Click to view details",
          payload,
        });
        refreshUnreadCount();

        setTimeout(() => {
          setOverlayNotification(null);
        }, 5000);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        overlayNotification,
        dismissOverlay,
        onNotificationRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
