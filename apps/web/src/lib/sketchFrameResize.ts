/**
 * Where the pointer counts while a sketch outline is stretched by a handle of its frame.
 *
 * The handle stands off the edge it moves by a gap that follows the zoom, so it is rarely a whole
 * snap step. Snapping the pointer and taking the gap off afterwards left the edge at a crooked
 * value (a rectangle of 20 came out 24.83); it is the edge that lands on the grid, so the gap is
 * taken off first, the result snapped, and the gap put back for the stretch to take off again.
 */
export function resizePointerOnGrid(
  raw: { x: number; z: number },
  grab: { x: number; z: number },
  step: number,
  halfWidth: number,
  halfDepth: number,
) {
  const snap = (value: number) => (step > 0 ? Math.round(value / step) * step : value);
  const limit = (value: number, half: number) => Math.min(half, Math.max(-half, value));
  return {
    x: limit(snap(raw.x - grab.x), halfWidth) + grab.x,
    z: limit(snap(raw.z - grab.z), halfDepth) + grab.z,
  };
}
