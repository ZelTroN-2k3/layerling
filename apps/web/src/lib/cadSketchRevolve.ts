import type { OcctKernel, ShapeHandle } from "occt-wasm";
import { cadSketchRegions, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import { circularArcMidpoint } from "@/lib/sketchCircularArc";
import { solidSketchProfile } from "@/lib/sketchConstruction";
import type { SketchProfile } from "@/types/layerling";

// A revolved sketch as an exact CAD body, built like an extruded one. It lives
// outside the worker so the end-to-end tests can run it against the real kernel.

/** How far a point may stand to the right of the axis and still count as on it. */
const AXIS_TOLERANCE = 1e-6;

/** The profile stands left of the axis (x <= 0), as the sketch view draws it. */
export function revolveProfileFitsAxis(sketch: SketchProfile) {
  // A construction line may stand anywhere; only the outline has to keep to the left (#229).
  const profile = solidSketchProfile(sketch);
  return profile.points.length > 0 && profile.points.every((point) =>
    point.x <= AXIS_TOLERANCE
    && (!point.handleIn || point.handleIn.x <= AXIS_TOLERANCE)
    && (!point.handleOut || point.handleOut.x <= AXIS_TOLERANCE));
}

/**
 * The section as a wire in the plane z = 0: the distance from the axis along x,
 * the height along y. The sketch's x runs left of the axis and its z downwards,
 * so both flip - the same mapping the mesh revolve uses.
 */
function sectionWire(cad: OcctKernel, path: OrderedCadSketchPath, maxZ: number) {
  const map = (point: { x: number; z: number }) => ({ x: Math.max(0, -point.x), y: maxZ - point.z, z: 0 });
  const edges = path.steps.map(({ segment, from, to }) => {
    const forward = segment.startId === from.id;
    const first = forward ? from.handleOut : from.handleIn;
    const second = forward ? to.handleIn : to.handleOut;
    if (segment.kind !== "line" && first && second) {
      // A rounded corner turns into a torus piece, not a free-form surface.
      const middle = circularArcMidpoint(from, first, second, to);
      if (middle) return cad.makeArcEdge(map(from), map(middle), map(to));
      return cad.makeBezierEdge([map(from), map(first), map(second), map(to)]);
    }
    return cad.makeLineEdge(map(from), map(to));
  });
  return cad.makeWire(edges);
}

/**
 * The exact solid of revolution of a sketch about the vertical axis, from
 * `startAngle` degrees through `sweepAngle` (negative sweeps go the other way,
 * as in the mesh revolve). Throws when the profile is not entirely on the
 * axis's left side or has no closed loop; the caller may then fall back.
 */
export function buildRevolvedSketchSolid(cad: OcctKernel, sketch: SketchProfile, startAngle: number, sweepAngle: number): ShapeHandle {
  const profile = solidSketchProfile(sketch);
  if (!revolveProfileFitsAxis(profile)) throw new Error("The profile crosses the revolve axis");
  const regions = cadSketchRegions(profile);
  if (regions.length === 0) throw new Error("No closed profile found. Draw at least one closed loop and ensure it has no degenerate (zero-area) geometry.");
  const maxZ = Math.max(...profile.points.flatMap((point) => [point.z, point.handleIn?.z ?? point.z, point.handleOut?.z ?? point.z]));
  const sweep = Math.abs(sweepAngle);
  const angle = Math.min(2 * Math.PI, (sweep * Math.PI) / 180);
  const rotation = sweepAngle < 0 ? startAngle + sweepAngle : startAngle;
  const axis = { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 } };
  const solids: ShapeHandle[] = regions.map((region) => {
    let face = cad.makeFace(sectionWire(cad, region.outer, maxZ));
    if (region.holes.length > 0) face = cad.addHolesInFace(face, region.holes.map((hole) => sectionWire(cad, hole, maxZ)));
    let solid = cad.revolve(face, axis, angle);
    if (Math.abs(rotation) > 1e-8) solid = cad.rotate(solid, axis, (rotation * Math.PI) / 180);
    return solid;
  });
  const result = solids.length === 1 ? solids[0] : cad.makeCompound(solids);
  if (!cad.isValid(result)) throw new Error("OpenCascade produced invalid sketch topology");
  return result;
}
