"use client";

import { useSyncExternalStore } from "react";
import { getToolbarSize, subscribeToToolbarSize, type ToolbarSize } from "@/lib/toolbarSize";

export function useToolbarSize(): ToolbarSize {
  return useSyncExternalStore(subscribeToToolbarSize, getToolbarSize, () => "medium");
}
