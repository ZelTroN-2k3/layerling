import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import { normalizeSketchRevolveSettings, sketchProfileToRevolvePolygons } from "@/lib/sketchRevolve";
import { mirrorSign } from "@/lib/workplaneShapes";
import type { SketchProfile, SketchRevolveSettings, WorkplaneShape } from "@/types/layerling";

/**
 * A revolved body is centred on its own outline, so a partial sweep has its middle somewhere
 * else than the axis it turns around. This is where the axis lies from that middle, in the
 * body's own units and unscaled, in the frame the mesh is built in (x to the right, z to the
 * front). A full turn is symmetric about the axis: (0, 0).
 */
export function revolveAxisOffset(profile: SketchProfile, settings?: Partial<SketchRevolveSettings>) {
  const normalized = normalizeSketchRevolveSettings(settings);
  const radii = sketchProfileToRevolvePolygons(profile, normalized).flatMap((polygon) => polygon.map((point) => point[0]));
  if (radii.length === 0 || Math.abs(normalized.sweepAngle) >= 360) return { x: 0, z: 0 };
  const inner = Math.max(0, Math.min(...radii));
  const outer = Math.max(0, Math.max(...radii));
  const sweep = Math.abs(normalized.sweepAngle);
  const first = normalized.sweepAngle < 0 ? normalized.startAngle + normalized.sweepAngle : normalized.startAngle;
  const last = first + sweep;
  // The extremes of an arc lie at its ends and wherever it crosses a quarter turn.
  const angles = [first, last];
  for (let quarter = Math.ceil(first / 90) * 90; quarter < last; quarter += 90) angles.push(quarter);
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  angles.forEach((degrees) => {
    const radians = (degrees * Math.PI) / 180;
    [inner, outer].forEach((radius) => {
      const x = radius * Math.cos(radians);
      const z = -radius * Math.sin(radians);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    });
  });
  return { x: -(minX + maxX) / 2, z: -(minZ + maxZ) / 2 };
}

/**
 * How far a revolved body's middle has to move in the world so that its axis stays where it was
 * when the sweep, start angle or profile changes. `scaleX` and `scaleZ` are how much the body
 * has been resized from the size it was built at; `nextScaleX` and `nextScaleZ` are the same for
 * the rebuilt body (they differ when a rebuild drops the resizing).
 */
export function revolveAxisShift(
  shape: WorkplaneShape,
  previous: { profile: SketchProfile; settings: Partial<SketchRevolveSettings> },
  next: { profile: SketchProfile; settings: Partial<SketchRevolveSettings> },
  scaleX = 1,
  scaleZ = 1,
  nextScaleX = scaleX,
  nextScaleZ = scaleZ,
) {
  const before = revolveAxisOffset(previous.profile, previous.settings);
  const after = revolveAxisOffset(next.profile, next.settings);
  const mirror = new THREE.Vector3(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));
  const turn = quaternionForShape(shape);
  const toWorld = (offset: { x: number; z: number }, sx: number, sz: number) => new THREE.Vector3(offset.x * sx, 0, offset.z * sz).multiply(mirror).applyQuaternion(turn);
  const shift = toWorld(before, scaleX, scaleZ).sub(toWorld(after, nextScaleX, nextScaleZ));
  return { x: shift.x, y: shift.y, z: shift.z };
}
