import { JoinType, type OcctKernel, type ShapeHandle } from "occt-wasm";
import { cadSketchRegions, orderedCadSketchPaths, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import { pathWire } from "@/lib/sketchCadWire";
import { sampledPath } from "@/lib/sketchStroke";
import type { SketchProfile, SketchStroke } from "@/types/layerling";

/** Round corners, and corners carried on to a point. */
const JOIN_ARC = JoinType.Arc;
const JOIN_INTERSECTION = JoinType.Intersection;
/** A miter longer than this many times the half width is cut off in the polygon stroke; here the polygon stroke does it. */
const MITER_LIMIT = 4;

/**
 * Whether a drawn corner is too sharp for the kernel's pointed corner: it carries on without a
 * limit, where the stroke cuts a spike off beyond MITER_LIMIT (sketchStroke.ts).
 */
function hasSpikeCorner(path: OrderedCadSketchPath): boolean {
  const points = sampledPath(path);
  const count = points.length;
  for (let index = 0; index < count; index += 1) {
    const before = points[(index + count - 1) % count];
    const corner = points[index];
    const after = points[(index + 1) % count];
    const ax = corner.x - before.x;
    const az = corner.z - before.z;
    const bx = after.x - corner.x;
    const bz = after.z - corner.z;
    const lengths = Math.hypot(ax, az) * Math.hypot(bx, bz);
    if (lengths < 1e-12) continue;
    const cosTurn = (ax * bx + az * bz) / lengths;
    // The miter is 1 / cos(turn / 2) times the half width.
    if (Math.sqrt(Math.max(0, (1 + cosTurn) / 2)) < 1 / MITER_LIMIT) return true;
  }
  return false;
}

/** The area inside an outline as a flat prism `height` tall, the outline moved out by `delta` (in by a negative one). Null when the kernel cannot move it. */
function filledLoop(cad: OcctKernel, path: OrderedCadSketchPath, delta: number, join: number, height: number): ShapeHandle | null {
  const wire = pathWire(cad, path);
  const base = cad.makeFace(wire);
  if (delta === 0) return cad.extrude(base, 0, height, 0);
  const offset = cad.offsetWire2D(wire, delta, join);
  const face = cad.makeFace(offset);
  const baseArea = cad.getSurfaceArea(base);
  const area = cad.getSurfaceArea(face);
  // Out must be wider, in narrower and not gone: a collapsed or turned-inside-out offset is no result.
  if (!(area > 1e-9) || (delta > 0 ? area <= baseArea : area >= baseArea)) return null;
  return cad.extrude(face, 0, height, 0);
}

/** The material of one region - its outline and the holes in it - moved out by `delta` (the holes shrink then). */
function regionPrism(cad: OcctKernel, region: ReturnType<typeof cadSketchRegions>[number], delta: number, join: number, height: number): ShapeHandle | null {
  let solid = filledLoop(cad, region.outer, delta, join, height);
  if (!solid) return null;
  for (const hole of region.holes) {
    const hollow = filledLoop(cad, hole, -delta, join, height + 2);
    if (!hollow) return null;
    solid = cad.cut(solid, cad.translate(hollow, 0, -1, 0));
  }
  return solid;
}

/**
 * A stroked sketch (#154) or a widened one (#215) as an exact solid: the closed outlines moved
 * in or out by the kernel, so a line stays a plane, an arc a cylinder and a curve a single
 * spline face - not the hundreds of short straight pieces the polygon stroke makes, which the
 * edge tool cannot work on and which show as stripes. Null whenever the polygon stroke has to
 * do it: open lines, bevelled corners (the kernel has none), a pointed corner that would run
 * into a spike, a stroke wider than the outline allows, or any failure of the kernel.
 */
export function buildStrokedSketchSolid(cad: OcctKernel, profile: SketchProfile, stroke: SketchStroke, height: number): ShapeHandle | null {
  if (stroke.join === "bevel") return null;
  if (orderedCadSketchPaths(profile).some((path) => !path.closed)) return null;
  let regions: ReturnType<typeof cadSketchRegions>;
  try {
    regions = cadSketchRegions(profile);
  } catch {
    return null;
  }
  if (!regions.length) return null;
  const join = stroke.join === "round" ? JOIN_ARC : JOIN_INTERSECTION;
  if (stroke.join === "miter" && regions.some((region) => [region.outer, ...region.holes].some(hasSpikeCorner))) return null;
  try {
    const [outerDelta, innerDelta] = stroke.align === "inside"
      ? [0, -stroke.width]
      : stroke.align === "outside"
        ? [stroke.width, 0]
        : stroke.align === "grow"
          ? [stroke.width, null]
          : [stroke.width / 2, -stroke.width / 2];
    let result: ShapeHandle | null = null;
    for (const region of regions) {
      const outer = regionPrism(cad, region, outerDelta, join, height);
      if (!outer) return null;
      let piece = outer;
      if (innerDelta !== null) {
        const inner = regionPrism(cad, region, innerDelta, join, height + 2);
        if (!inner) return null;
        piece = cad.cut(outer, cad.translate(inner, 0, -1, 0));
      }
      result = result ? cad.fuse(result, piece) : piece;
    }
    if (!result || !cad.isValid(result) || !(cad.getVolume(result) > 1e-9)) return null;
    return result;
  } catch (error) {
    // A kernel that has crashed is for the caller to reset; any other failure is the polygon route's to handle.
    if (/memory|WebAssembly|abort/i.test(error instanceof Error ? error.message : String(error))) throw error;
    return null;
  }
}
