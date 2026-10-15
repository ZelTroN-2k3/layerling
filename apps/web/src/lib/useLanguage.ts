"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, getLanguage, subscribeToLanguage, type Language } from "@/lib/i18n";

/**
 * Re-renders the calling component when the language changes. The server and
 * the first client render both answer English, so hydration matches; the stored
 * choice is applied in an effect straight afterwards.
 */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeToLanguage, getLanguage, () => DEFAULT_LANGUAGE);
}
