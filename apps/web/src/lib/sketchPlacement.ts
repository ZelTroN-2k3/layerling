import {
  placementPatchForNewShape,
  placementWorkplanePoint,
  type PlacementWorkplane,
} from "@/lib/placementWorkplane";
import { sketchBodyStretch } from "@/lib/sketchResize";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

export function placeSketchShape(
  shape: WorkplaneShape,
  workplane: PlacementWorkplane,
  existing?: WorkplaneShape | null,
) {
  if (existing) {
    return canonicalizeShape({
      ...shape,
      x: existing.x,
      z: existing.z,
      elevation: existing.elevation ?? 0,
      rotation: existing.rotation,
      rotationX: existing.rotationX ?? 0,
      rotationZ: existing.rotationZ ?? 0,
      mirrorX: existing.mirrorX,
      mirrorY: existing.mirrorY,
      mirrorZ: existing.mirrorZ,
      locked: existing.locked,
      hidden: existing.hidden,
    });
  }

  const basePoint = placementWorkplanePoint(workplane, shape.x, shape.z);
  return canonicalizeShape({
    ...shape,
    ...placementPatchForNewShape(shape, workplane, basePoint),
  });
}

export const placeSketchExtrusion = placeSketchShape;

/** A point in a sketch's own coordinates. */
export type SketchAnchor = { x: number; z: number };

/**
 * Where the middle of an extruded sketch body sits in its sketch's own coordinates. The body stands at
 * its x and z with that point under its middle, so the sketch is drawn over the body by putting this
 * point there (#291). The exact body remembers it: its frame is the middle of the outline as it was
 * built, curves included. Without it - or while the body is stretched - the middle of the points
 * stands in, which is the same for an outline of straight lines.
 */
export function sketchBodyAnchor(shape: WorkplaneShape): SketchAnchor {
  const frame = shape.cadBrepFrame;
  if (shape.cadBrep && frame && !sketchBodyStretch(shape)) return { x: frame.x, z: frame.z };
  const points = shape.sketchProfile?.points ?? [];
  if (!points.length) return { x: 0, z: 0 };
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
}

/**
 * An edited sketch body, put where its outline is: the rebuilt body is centred on its new outline, so
 * it moves by as much as that middle moved in the sketch - turned into the body's own directions
 * (`xAxis`, `zAxis`: where its sketch axes point in the world). What the edit left alone stays where it
 * was; before, the body kept its middle and a corner pulled out moved everything else (#291).
 */
export function movedWithEditedOutline(
  placed: WorkplaneShape,
  existing: WorkplaneShape,
  before: SketchAnchor,
  after: SketchAnchor,
  axes: { x: readonly [number, number, number]; z: readonly [number, number, number] },
) {
  const dx = after.x - before.x;
  const dz = after.z - before.z;
  if (Math.abs(dx) < 1e-9 && Math.abs(dz) < 1e-9) return placed;
  return canonicalizeShape({
    ...placed,
    x: existing.x + axes.x[0] * dx + axes.z[0] * dz,
    z: existing.z + axes.x[2] * dx + axes.z[2] * dz,
    elevation: (existing.elevation ?? 0) + axes.x[1] * dx + axes.z[1] * dz,
  });
}

