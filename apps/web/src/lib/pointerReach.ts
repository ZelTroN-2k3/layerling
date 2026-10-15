/**
 * How far from a point the pointer still catches it, for a finger and for a mouse (#337).
 * A fingertip is far larger than a mouse pointer and covers what it aims at, so every
 * snapping and picking radius given in pixels is stretched while the last thing that
 * pressed or moved was a touch.
 */
export const TOUCH_REACH_FACTOR = 1.8;

export function reachForPointer(base: number, pointerType: string | null | undefined, factor = TOUCH_REACH_FACTOR) {
  return pointerType === "touch" ? Math.round(base * factor) : base;
}

let lastPointerType: string | null = null;
let listening = false;

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  // Until something has been touched or moved, a device whose main pointer is coarse counts as touch.
  lastPointerType = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches ? "touch" : "mouse";
  const remember = (event: PointerEvent) => {
    if (event.pointerType) lastPointerType = event.pointerType;
  };
  // In the capture phase, so the type is known before any handler of the page looks at it.
  window.addEventListener("pointerdown", remember, { capture: true, passive: true });
  window.addEventListener("pointermove", remember, { capture: true, passive: true });
}

// Started when the module loads, so the very first press is already seen.
listen();

/** The kind of pointer that was last in use: "touch", "mouse" or "pen". */
export function currentPointerType() {
  listen();
  return lastPointerType;
}

/** A pixel radius for the pointer in use now. */
export function pointerReach(base: number, factor = TOUCH_REACH_FACTOR) {
  return reachForPointer(base, currentPointerType(), factor);
}
