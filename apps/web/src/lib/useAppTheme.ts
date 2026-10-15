"use client";

import { useSyncExternalStore } from "react";
import { getAppThemePreference, subscribeToAppTheme, type AppThemePreference } from "@/lib/appTheme";

export function useAppTheme(): AppThemePreference {
  return useSyncExternalStore(subscribeToAppTheme, getAppThemePreference, () => "system");
}
