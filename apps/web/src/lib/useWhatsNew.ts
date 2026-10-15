"use client";

import { useCallback, useEffect, useState } from "react";
import { compareVersions, lastSeenVersion, latestWhatsNew, whatsNewSince, type WhatsNewEntry } from "@/lib/whatsNew";

const LAST_SEEN_KEY = "layerling.lastSeenVersion";
const PROJECTS_KEY = "layerling.projects";

/** Asks the start page to show the list again; the footer link sends it. */
export const SHOW_WHATS_NEW_EVENT = "layerling:show-whats-new";

export type WhatsNewView = {
  entries: WhatsNewEntry[];
  /** The version this browser last saw, or null when the list was opened by hand. */
  from: string | null;
};

function readLastSeen() {
  try {
    return window.localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function rememberVersion(version: string) {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, version);
  } catch {
    // Without storage the list comes back with the next visit, which is harmless.
  }
}

function hasStoredDesigns() {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(PROJECTS_KEY) ?? "[]");
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

/**
 * What came with the versions since this browser last looked. The last version
 * seen is kept in the browser: a first-time visitor is told nothing and only
 * has the current version remembered, a returning one gets the list until they
 * close it. Opened by hand it lists the latest versions instead.
 */
export function useWhatsNew(current: string) {
  const [view, setView] = useState<WhatsNewView | null>(null);

  useEffect(() => {
    const seen = lastSeenVersion(readLastSeen(), hasStoredDesigns());
    if (seen === null) {
      rememberVersion(current);
      return;
    }
    if (compareVersions(seen, current) >= 0) return;
    const entries = whatsNewSince(seen, current);
    if (entries.length > 0) setView({ entries, from: seen });
    else rememberVersion(current);
  }, [current]);

  useEffect(() => {
    const showAgain = () => {
      const entries = latestWhatsNew(current);
      if (entries.length > 0) setView((previous) => previous ?? { entries, from: null });
    };
    window.addEventListener(SHOW_WHATS_NEW_EVENT, showAgain);
    return () => window.removeEventListener(SHOW_WHATS_NEW_EVENT, showAgain);
  }, [current]);

  const dismiss = useCallback(() => {
    const seen = readLastSeen();
    if (!seen || compareVersions(seen, current) < 0) rememberVersion(current);
    setView(null);
  }, [current]);

  return { view, dismiss };
}
