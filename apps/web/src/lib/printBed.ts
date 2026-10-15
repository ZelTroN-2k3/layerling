import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import { PRINTER_PRESETS, type PrinterPreset } from "@/lib/printerPresets.generated";
import { isNonSolidShapeKind, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

export function printerPresetById(id: string | undefined | null): PrinterPreset | null {
  if (!id) return null;
  return PRINTER_PRESETS.find((preset) => preset.id === id) ?? null;
}

export type BedFootprint = { minX: number; maxX: number; minZ: number; maxZ: number };

/**
 * Where a body stands on the plate, seen from above: its box, turned the way the
 * body is turned, projected onto the workplane. A tapered or imported body
 * stays inside that box, so the footprint never reports too little.
 */
export function shapeBedFootprint(shape: WorkplaneShape): BedFootprint {
  const halfWidth = shapeWidth(shape) / 2;
  const halfDepth = shapeDepth(shape) / 2;
  const halfHeight = shape.height / 2;
  const turn = quaternionForShape(shape);
  const corner = new THREE.Vector3();
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        corner.set(sx * halfWidth, sy * halfHeight, sz * halfDepth).applyQuaternion(turn);
        minX = Math.min(minX, corner.x);
        maxX = Math.max(maxX, corner.x);
        minZ = Math.min(minZ, corner.z);
        maxZ = Math.max(maxZ, corner.z);
      }
    }
  }
  return { minX: shape.x + minX, maxX: shape.x + maxX, minZ: shape.z + minZ, maxZ: shape.z + maxZ };
}

/**
 * How low and how high a body reaches above the workplane, its box turned the
 * way the body is turned - the same generous box as the footprint.
 */
export function shapeVerticalExtent(shape: WorkplaneShape): { minY: number; maxY: number } {
  const halfWidth = shapeWidth(shape) / 2;
  const halfDepth = shapeDepth(shape) / 2;
  const halfHeight = shape.height / 2;
  const turn = quaternionForShape(shape);
  const corner = new THREE.Vector3();
  let reach = 0;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        corner.set(sx * halfWidth, sy * halfHeight, sz * halfDepth).applyQuaternion(turn);
        reach = Math.max(reach, Math.abs(corner.y));
      }
    }
  }
  const centre = (shape.elevation ?? 0) + halfHeight;
  return { minY: centre - reach, maxY: centre + reach };
}

export type BedOverhang = {
  shape: WorkplaneShape;
  /** How far the body reaches past each edge of the plate, in millimetres (0 = inside). */
  left: number;
  right: number;
  back: number;
  front: number;
  /** How far it reaches above the printer's build height (0 = fits). */
  top: number;
};

/** A hair of tolerance, so a body placed exactly on the edge does not count. */
const BED_EDGE_TOLERANCE = 0.01;

/**
 * The bodies that do not fit a printer of `width` x `depth` x `height`: past
 * the plate, centred on the workplane origin as the grid is, or taller than
 * the build height. Height counts from the lowest printed body, because the
 * slicer sets the model down on the plate anyway - a design that floats or
 * sinks a little is not too tall for that. Holes, hidden bodies and rulers are
 * not printed, so they never count.
 */
export function bedOverhangs(shapes: readonly WorkplaneShape[], width: number, depth: number, height?: number): BedOverhang[] {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const printed = shapes.filter((shape) => !shape.hole && !shape.hidden && !isNonSolidShapeKind(shape.kind));
  const vertical = new Map(printed.map((shape) => [shape, shapeVerticalExtent(shape)]));
  const base = Math.min(...[...vertical.values()].map((extent) => extent.minY));
  const overhangs: BedOverhang[] = [];
  for (const shape of printed) {
    const footprint = shapeBedFootprint(shape);
    const left = Math.max(0, -halfWidth - footprint.minX);
    const right = Math.max(0, footprint.maxX - halfWidth);
    const back = Math.max(0, -halfDepth - footprint.minZ);
    const front = Math.max(0, footprint.maxZ - halfDepth);
    const top = height ? Math.max(0, (vertical.get(shape)?.maxY ?? 0) - base - height) : 0;
    if (Math.max(left, right, back, front, top) > BED_EDGE_TOLERANCE) {
      overhangs.push({ shape, left, right, back, front, top });
    }
  }
  return overhangs;
}
