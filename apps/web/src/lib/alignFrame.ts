import { placementWorkplaneIsBase, type PlacementWorkplane } from "@/lib/placementWorkplane";
import type { AlignAxis } from "@/types/layerling";

/**
 * Align along a workplane (#232). The align tool lines parts up along the three axes of the plate;
 * a part turned by 45° has its box round it, not its own edges, to line up with. With a workplane
 * set on a face the tool takes that plane's axes instead - its x, its normal and its z, as the
 * x, y and z of the handles - and measures each part along them, as similar tools do. Without a
 * workplane nothing changes.
 */
export type AlignAxes = {
  x: { x: number; y: number; z: number };
  y: { x: number; y: number; z: number };
  z: { x: number; y: number; z: number };
};

/** The box of a part along those axes: min and max of `x`, `y` and `z` as measured along each. */
export type FrameCuboid = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

type Vec = { x: number; y: number; z: number };

const unit = (vector: Vec): Vec => {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  return length > 1e-12 ? { x: vector.x / length, y: vector.y / length, z: vector.z / length } : { x: 0, y: 0, z: 0 };
};

/**
 * The axes of a set workplane; null where the world axes do: on the plate itself, and on a plane
 * that only stands higher (the top of a box) with its axes where the plate's are.
 */
export function alignAxesForWorkplane(workplane: PlacementWorkplane): AlignAxes | null {
  if (placementWorkplaneIsBase(workplane)) return null;
  const axes = { x: unit(workplane.xAxis), y: unit(workplane.normal), z: unit(workplane.zAxis) };
  const alongWorld = (vector: Vec, world: Vec) => Math.abs(dot(vector, world) - 1) < 1e-6;
  return alongWorld(axes.x, { x: 1, y: 0, z: 0 }) && alongWorld(axes.y, { x: 0, y: 1, z: 0 }) && alongWorld(axes.z, { x: 0, y: 0, z: 1 }) ? null : axes;
}

const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z;

/** The box of these points along the axes. Null for none. */
export function cuboidAlongAxes(points: Iterable<readonly [number, number, number]>, axes: AlignAxes): FrameCuboid | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let any = false;
  for (const [x, y, z] of points) {
    const point = { x, y, z };
    const u = dot(point, axes.x);
    const v = dot(point, axes.y);
    const w = dot(point, axes.z);
    any = true;
    if (u < minX) minX = u;
    if (u > maxX) maxX = u;
    if (v < minY) minY = v;
    if (v > maxY) maxY = v;
    if (w < minZ) minZ = w;
    if (w > maxZ) maxZ = w;
  }
  return any ? { minX, maxX, minY, maxY, minZ, maxZ } : null;
}

/** The eight corners of a box in axes' coordinates, as points of the world. */
export function cuboidCorners(box: FrameCuboid, axes: AlignAxes): Vec[] {
  const corners: Vec[] = [];
  for (const u of [box.minX, box.maxX]) for (const v of [box.minY, box.maxY]) for (const w of [box.minZ, box.maxZ]) {
    corners.push(pointAlongAxes(axes, u, v, w));
  }
  return corners;
}

/** The world point at (u, v, w) measured along the axes. */
export function pointAlongAxes(axes: AlignAxes, u: number, v: number, w: number): Vec {
  return {
    x: axes.x.x * u + axes.y.x * v + axes.z.x * w,
    y: axes.x.y * u + axes.y.y * v + axes.z.y * w,
    z: axes.x.z * u + axes.y.z * v + axes.z.z * w,
  };
}

/** The move in the world that shifts a part by `delta` along one of the axes. */
export function shiftAlongAxis(axes: AlignAxes, axis: AlignAxis, delta: number): Vec {
  const direction = axes[axis];
  return { x: direction.x * delta, y: direction.y * delta, z: direction.z * delta };
}
