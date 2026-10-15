/**
 * Saving a dense design takes the main thread for a second or more, and a click
 * that arrives meanwhile waits for it. So the autosave holds back while someone
 * is working - dragging, typing, scrolling - and runs in the first pause. It
 * never waits longer than `maxMs`, and a window that goes to the background is
 * saved at once, because it may be frozen or closed before it is idle again.
 */
export const INPUT_PAUSE_MS = 900;
export const INPUT_PAUSE_MAX_MS = 6000;

let lastInputAt = Number.NEGATIVE_INFINITY;
let watching = false;

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Remember that someone is working right now. */
export function noteUserInput() {
  lastInputAt = now();
}

/** Starts listening to the work that should hold a save back. Safe to call again. */
export function watchUserInput() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  const options = { capture: true, passive: true } as const;
  // A mouse that only hovers does not count; a held button (a drag) does.
  window.addEventListener("pointerdown", noteUserInput, options);
  window.addEventListener("pointermove", (event) => {
    if (event.buttons !== 0) noteUserInput();
  }, options);
  window.addEventListener("keydown", noteUserInput, options);
  window.addEventListener("wheel", noteUserInput, options);
}

/** Resolves once nothing was done for `quietMs`, after `maxMs` at the latest, or when the window is hidden. */
export function waitForInputPause(quietMs = INPUT_PAUSE_MS, maxMs = INPUT_PAUSE_MAX_MS) {
  return new Promise<void>((resolve) => {
    const startedAt = now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";
    const finish = () => {
      if (timer !== undefined) clearTimeout(timer);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", check);
      resolve();
    };
    function check() {
      const current = now();
      const quietFor = current - lastInputAt;
      const waited = current - startedAt;
      if (hidden() || quietFor >= quietMs || waited >= maxMs) {
        finish();
        return;
      }
      timer = setTimeout(check, Math.max(16, Math.min(quietMs - quietFor, maxMs - waited)));
    }
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", check);
    check();
  });
}
