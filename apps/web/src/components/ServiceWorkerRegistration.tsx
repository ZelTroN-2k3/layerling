"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that keeps layerling on the visitor's computer
 * for offline use. It exists only in the static export (scripts/
 * generate-service-worker.mjs writes it), and browsers only allow one on
 * https or localhost - a plain-http address such as the home server simply
 * runs without it, as before.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== "true") return;
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Without it layerling works exactly as before, just not offline.
    });
  }, []);
  return null;
}
