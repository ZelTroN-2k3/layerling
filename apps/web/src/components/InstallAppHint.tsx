"use client";

import { Download, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { t, type MessageKey } from "@/lib/i18n";
import { installHintKey } from "@/lib/installHint";
import { useLanguage } from "@/lib/useLanguage";

const DISMISSED_KEY = "layerling.installHintDismissed";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

declare global {
  interface Window {
    /** Kept by the inline script in layout.tsx - the browser fires it once, often before React is up. */
    __layerlingInstallPrompt?: InstallPromptEvent | null;
  }
}

function runsAsInstalledApp() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * A strip on the start page: layerling can be installed as an app and then
 * starts without internet. Shown only where both work - https with service
 * workers - so the plain-http home server never promises what it cannot do;
 * never inside the installed app itself, and gone for good once dismissed.
 */
export function InstallAppHint() {
  useLanguage();
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [fallbackKey, setFallbackKey] = useState<MessageKey>("installHint.chromium");

  useEffect(() => {
    if (!window.isSecureContext || !("serviceWorker" in navigator) || runsAsInstalledApp()) return;
    try {
      if (window.localStorage.getItem(DISMISSED_KEY) === "1") return;
    } catch {
      // Storage blocked: show the hint, it just cannot remember being closed.
    }
    setFallbackKey(installHintKey(navigator.userAgent, navigator.maxTouchPoints ?? 0));
    const sync = () => {
      setPrompt(window.__layerlingInstallPrompt ?? null);
      if (runsAsInstalledApp()) setVisible(false);
    };
    sync();
    setVisible(true);
    window.addEventListener("layerling-install-prompt", sync);
    return () => window.removeEventListener("layerling-install-prompt", sync);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // nothing to remember it in
    }
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    window.__layerlingInstallPrompt = null;
    setPrompt(null);
    if (choice?.outcome === "accepted") setVisible(false);
  };

  return (
    <aside className="install-app-hint" aria-label={t("installHint.title")}>
      <span className="install-app-hint-icon" aria-hidden="true">
        <WifiOff size={20} strokeWidth={2.4} />
      </span>
      <div className="install-app-hint-text">
        <strong>{t("installHint.title")}</strong>
        <span>{t("installHint.body")} {prompt ? null : t(fallbackKey)}</span>
      </div>
      {prompt ? (
        <button className="install-app-hint-button" type="button" onClick={install}>
          <Download size={16} strokeWidth={2.6} />
          <span>{t("installHint.install")}</span>
        </button>
      ) : null}
      <button className="install-app-hint-close" type="button" aria-label={t("installHint.dismiss")} title={t("installHint.dismiss")} onClick={dismiss}>
        <X size={16} />
      </button>
    </aside>
  );
}
