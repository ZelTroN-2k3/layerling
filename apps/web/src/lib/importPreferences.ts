/**
 * What the import window remembers between visits. Browser storage may be blocked, so every read
 * and write is guarded and the import works without it.
 */
const KEEP_SVG_PAGE_KEY = "layerling.importKeepSvgPage";

/** Whether an imported SVG keeps its place on its page, so the files of one page line up (#258). */
export function readKeepSvgPage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEEP_SVG_PAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function storeKeepSvgPage(keep: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (keep) window.localStorage.setItem(KEEP_SVG_PAGE_KEY, "1");
    else window.localStorage.removeItem(KEEP_SVG_PAGE_KEY);
  } catch {
    // The choice still holds for this visit.
  }
}
