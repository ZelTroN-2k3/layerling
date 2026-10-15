export const TOOLBAR_SIZE_STORAGE_KEY = "layerling.toolbarSize";

export const TOOLBAR_SIZE_OPTIONS = ["small", "medium", "large"] as const;

export type ToolbarSize = (typeof TOOLBAR_SIZE_OPTIONS)[number];

export function normalizeToolbarSize(value: unknown): ToolbarSize {
  return value === "small" || value === "large" ? value : "medium";
}

/**
 * The size is a data attribute on <html>; globals.css turns it into
 * --toolbar-scale, and the browser scales the existing icons. Medium is the
 * plain stylesheet, so it carries no attribute.
 */
export function applyToolbarSize(size: ToolbarSize) {
  if (typeof document === "undefined") return;
  if (size === "medium") delete document.documentElement.dataset.toolbarSize;
  else document.documentElement.dataset.toolbarSize = size;
}

/**
 * Runs in <head> before the page paints, so a small or large bar does not
 * first show at medium and then jump.
 */
export const TOOLBAR_SIZE_BOOT_SCRIPT = `try{var s=localStorage.getItem(${JSON.stringify(TOOLBAR_SIZE_STORAGE_KEY)});if(s==="small"||s==="large")document.documentElement.dataset.toolbarSize=s}catch(e){}`;

function readStoredToolbarSize(): ToolbarSize {
  try {
    return normalizeToolbarSize(window.localStorage.getItem(TOOLBAR_SIZE_STORAGE_KEY));
  } catch {
    return "medium";
  }
}

const listeners = new Set<() => void>();
let currentToolbarSize: ToolbarSize = typeof window !== "undefined" ? readStoredToolbarSize() : "medium";

export function setToolbarSize(size: ToolbarSize) {
  currentToolbarSize = size;
  try {
    window.localStorage.setItem(TOOLBAR_SIZE_STORAGE_KEY, size);
  } catch {
    // The size still applies for this session when storage is unavailable.
  }
  applyToolbarSize(size);
  listeners.forEach((listener) => listener());
}

export function getToolbarSize(): ToolbarSize {
  return currentToolbarSize;
}

export function subscribeToToolbarSize(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
