"use client";

import { useEffect, useState } from "react";
import { checkAppUpdate, dismissUpdate as storeDismissUpdate, isUpdateDismissed, type AppUpdateInfo } from "./appUpdate";

// layerling.com and the home test server are updated whenever layerling is
// published, and the service worker tells about a new version there. Asking
// GitHub would only announce a release they may never get - a fix to the start
// scripts, say - and the notice would stay for good. Every other copy, local,
// Docker or on a web server of its own, still asks.
const PUBLISHED_HOSTS = new Set(["layerling.com", "www.layerling.com", "layerling.server"]);

function asksGitHubForUpdates() {
  return typeof window === "undefined" || !PUBLISHED_HOSTS.has(window.location.hostname.toLowerCase());
}

export function useAppUpdate(currentVersion: string) {
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!asksGitHubForUpdates()) return;
    let cancelled = false;
    setIsChecking(true);
    checkAppUpdate(currentVersion)
      .then((info) => {
        if (!cancelled && info) {
          setUpdate(info);
          setIsDismissed(isUpdateDismissed(info.latestVersion));
        }
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentVersion]);

  const dismiss = () => {
    if (update) {
      storeDismissUpdate(update.latestVersion);
      setIsDismissed(true);
    }
  };

  return {
    update,
    isDismissed,
    isChecking,
    dismiss,
  };
}
