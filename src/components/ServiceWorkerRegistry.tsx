"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistry() {
  useEffect(() => {
    console.log("Checking Service Worker support..."); // האם הקומפוננטה בכלל רצה?
    
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("✅ Service Worker registered successfully!", registration.scope);
        })
        .catch((error) => {
          console.error("❌ Service Worker registration failed! Reason:", error);
        });
    } else {
      console.warn("⚠️ Service Workers are not supported in this browser (or you are not on localhost/HTTPS).");
    }
  }, []);

  return null;
}