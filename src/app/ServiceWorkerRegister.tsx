"use client";

import { useEffect } from "react";

/**
 * Registers a minimal pass-through service worker in production so the app
 * meets Chrome’s PWA install criteria (HTTPS + manifest + controlling SW).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
