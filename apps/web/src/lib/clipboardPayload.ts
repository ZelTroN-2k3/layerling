/*
 * What layerling puts on its clipboards. A copy lands in up to three places -
 * the tab itself, the browser's small local storage (for other tabs) and the
 * system clipboard (for other browsers) - and any of them can fail or be too
 * small for a large mesh. Each copy therefore carries the moment it was made,
 * and pasting takes the newest one: an older copy left behind somewhere can no
 * longer slip in instead of what was just copied.
 */

/** Above this a copy stays out of local storage: it holds only about 5 MB, which the project list needs too. */
export const LOCAL_CLIPBOARD_LIMIT = 1_000_000;

export type ClipboardPayload<T> = { copiedAt: number; shapes: T[] };

/** The text for local storage and the system clipboard; `shapesJson` is the already serialised array. */
export function encodeClipboardPayload(shapesJson: string, copiedAt: number) {
  return `{"copiedAt":${Math.max(0, Math.floor(copiedAt))},"shapes":${shapesJson}}`;
}

/** Reads what an earlier or current layerling wrote; a bare array (before stamps) counts as oldest. */
export function decodeClipboardPayload(text: string): ClipboardPayload<unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) return { copiedAt: 0, shapes: parsed };
    if (parsed && typeof parsed === "object") {
      const { copiedAt, shapes } = parsed as { copiedAt?: unknown; shapes?: unknown };
      if (Array.isArray(shapes)) return { copiedAt: typeof copiedAt === "number" && Number.isFinite(copiedAt) ? copiedAt : 0, shapes };
    }
  } catch {
    // not ours
  }
  return null;
}

/** The newest copy that holds something; on a tie the earlier candidate wins. */
export function newestClipboard<T>(candidates: Array<ClipboardPayload<T> | null | undefined>): ClipboardPayload<T> | null {
  let best: ClipboardPayload<T> | null = null;
  for (const candidate of candidates) {
    if (!candidate || candidate.shapes.length === 0) continue;
    if (!best || candidate.copiedAt > best.copiedAt) best = candidate;
  }
  return best;
}
