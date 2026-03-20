"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Bell, BellOff, Loader2 } from "lucide-react";

export function PushNotificationManager() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("Service Worker registered");
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
      
      // If user is logged in but hasn't updated their subscription in DB, we could sync it here
      // But usually it's better to explicitly have them opt-in via UI or check permission.
      if (sub && user) {
        syncSubscription(sub);
      }
    } catch (err) {
      console.error("Service worker registration failed", err);
    }
  }

  async function syncSubscription(sub: PushSubscription) {
    if (!user) return;
    try {
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
    } catch (err) {
      console.error("Failed to sync subscription to server", err);
    }
  }

  async function subscribeToPush() {
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      
      // ensure VAPID key is available
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error("VAPID public key not found");
        return;
      }
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(sub);
      await syncSubscription(sub);
      setLoading(false);
    } catch (err) {
      console.error("Subscription failed:", err);
      setLoading(false);
    }
  }

  async function unsubscribe() {
    if (!subscription) return;
    try {
      setLoading(true);
      await subscription.unsubscribe();
      setSubscription(null);
      // Wait, we also need to tell the server to remove it, but for now we just unsubscribe locally.
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // send endpoint to identify which to remove
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      setLoading(false);
    } catch (err) {
      console.error("Unsubscribe failed", err);
      setLoading(false);
    }
  }

  if (!isSupported || !user) return null;

  // Render a tiny floating widget or nothing if subscribed.
  // We'll show a small bell in the bottom right contextually if they haven't subscribed.
  if (subscription) {
    return null; // hide if already subscribed, or we could show settings.
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white shadow-lg rounded-xl p-4 border flex items-center gap-4 max-w-sm">
        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
          <Bell size={24} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">Enable Notifications</h4>
          <p className="text-xs text-slate-500">Get alerted for new SOPs and updates.</p>
        </div>
        <button
          onClick={subscribeToPush}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Enable"}
        </button>
      </div>
    </div>
  );
}

// Utility function
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
