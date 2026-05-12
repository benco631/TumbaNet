"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function EnableNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      setIsSubscribed(true);
    }
  }, []);

  const subscribeUser = async () => {
    // 1. האם יש תמיכה בכלל?
    if (!("serviceWorker" in navigator)) {
      alert("Debug: Browser does not support service workers.");
      return;
    }

    setIsLoading(true);

    try {
      // 2. מבקשים הרשאה
      const permission = await Notification.requestPermission();
      
      // החשוד המרכזי בדרך כלל נופל פה!
      if (permission !== "granted") {
        alert(`Debug: Permission is currently '${permission}'. You need to reset site settings in your phone's browser.`);
        setIsLoading(false);
        return;
      }

      // 3. מחכים ל-Service Worker שיהיה מוכן
      const registration = await navigator.serviceWorker.ready;
      if (!registration) {
        alert("Debug: Service worker registration is missing or hanging.");
        setIsLoading(false);
        return;
      }

      // 4. מוודאים שיש מפתח ב-Vercel
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        alert("Debug: VAPID Public Key is missing! Check Vercel Environment Variables.");
        setIsLoading(false);
        return;
      }

      // 5. מייצרים את המנוי
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 6. שולחים לשרת
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        alert("Debug: Success! Server returned 200 OK.");
        setIsSubscribed(true);
      } else {
        const errorText = await response.text();
        alert(`Debug: Server Error ${response.status} - ${errorText}`);
      }
    } catch (error) {
      // המרה בטוחה לשגיאה כדי לרצות את ה-Linter בלי להשתמש ב-any
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Debug: Caught an exception: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubscribed) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md shadow-lg flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Bell size={20} className="animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Stay Updated</h3>
          <p className="text-xs text-gray-400 mt-1">
            Get alerts when someone reports an activity.
          </p>
        </div>
      </div>
      
      <button
        onClick={subscribeUser}
        disabled={isLoading}
        className="whitespace-nowrap px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
      >
        {isLoading ? "Enabling..." : "Enable"}
      </button>
    </div>
  );
}