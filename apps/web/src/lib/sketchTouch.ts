/**
 * Which part of a sketch a finger means (#337). A fingertip lands several pixels from the
 * small point or the thin line it aims at, so a press on the empty plate near something
 * is handed to that thing - the way a mouse press right on it would be.
 */
export type TouchTier = "handle" | "point" | "segment";

/** How far a finger still reaches, in screen pixels, per kind of part. */
export const SKETCH_TOUCH_REACH_PX: Readonly<Record<TouchTier, number>> = { handle: 24, point: 20, segment: 16 };

const TIER_ORDER: readonly TouchTier[] = ["handle", "point", "segment"];

export type TouchCandidate<T> = { target: T; tier: TouchTier; distance: number };

/**
 * Handles come before points and points before lines, so the end of a line wins over the
 * line itself; within one kind the nearest wins. Null when nothing is within reach.
 */
export function pickTouchTarget<T>(candidates: readonly TouchCandidate<T>[], reach: Readonly<Record<TouchTier, number>> = SKETCH_TOUCH_REACH_PX): T | null {
  for (const tier of TIER_ORDER) {
    let best: TouchCandidate<T> | null = null;
    candidates.forEach((candidate) => {
      if (candidate.tier !== tier || candidate.distance > reach[tier]) return;
      if (!best || candidate.distance < best.distance) best = candidate;
    });
    if (best) return (best as TouchCandidate<T>).target;
  }
  return null;
}
