import { useEffect, useState } from "react";
import { pushApi } from "./api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type NotificationPermission = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as NotificationPermission);

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
        // Re-sync subscription to backend in case the DB was wiped or the record is missing
        if (sub && navigator.onLine) {
          pushApi.subscribe(sub.toJSON() as PushSubscriptionJSON).catch(() => {});
        }
      });
    });
  }, [supported]);

  async function subscribe() {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await pushApi.getVapidKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await pushApi.subscribe(sub.toJSON() as PushSubscriptionJSON);
      setPermission("granted");
      setSubscribed(true);
    } catch (err) {
      console.error("[push] subscribe failed", err);
      setPermission(Notification.permission as NotificationPermission);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushApi.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error("[push] unsubscribe failed", err);
    } finally {
      setLoading(false);
    }
  }

  return { permission, subscribed, loading, supported, subscribe, unsubscribe };
}
