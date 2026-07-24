"use client";

import { notificationService } from "@/src/services/notificationService";
import { authService } from "@/src/services/authService";
import { useRouter } from "next/navigation";

export function useLogout() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // 1. Deactivate push subscription
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await notificationService.deactivatePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
      }
    } catch (err) {
      console.error("Failed to deactivate push subscription during logout", err);
    }

    try {
      // 2. Clear auth session
      await authService.logout();
      // Alternatively, can call the logout route, but authService.logout() is the proper client-side way
      
      // 3. Redirect to login
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed", err);
      window.location.href = "/login";
    }
  };

  return { handleLogout };
}
