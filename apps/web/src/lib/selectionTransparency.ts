import type { WorkplaneShape } from "@/types/layerling";

/**
 * What the T key does with a selection (#276): if any part that can be see-through already is,
 * all of them become opaque, otherwise all become see-through. A mixed selection thus goes
 * opaque first and see-through on the next press. Holes are always see-through and locked parts
 * stay as they are, so neither takes part. `null` when nothing in the selection can change.
 */
export function nextSelectionTransparency(shapes: Array<Pick<WorkplaneShape, "hole" | "locked" | "transparent">>): boolean | null {
  const changeable = shapes.filter((shape) => !shape.locked && !shape.hole);
  if (!changeable.length) return null;
  return !changeable.some((shape) => Boolean(shape.transparent));
}
