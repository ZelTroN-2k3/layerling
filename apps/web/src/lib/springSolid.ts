import type { OcctKernel, ShapeHandle, SweepMode } from "occt-wasm";
import type { CadModifierSpringPart } from "@/lib/cadModifierTypes";

/** SweepMode.FixedUp, by value: the STEP export runs this outside the worker, where occt-wasm is only a type. */
const FIXED_UP = 2 as SweepMode;

/*
 * The exact body of a spring shape, as its display mesh draws it
 * (`createSpringGeometry`): a round wire swept along a helix, its ends cut
 * square to the wire.
 *
 * **Half a turn at a time.** The wire swept along the whole helix in one go
 * came out valid, but 0.7 % short in volume at 60 turns: one sweep surface
 * over many turns strays. Half a turn is swept once and copied up, turned
 * half round, half a pitch at a time - a helix is its own copy that way - and
 * the copies' wire surfaces are sewn into one solid with the two end discs,
 * without a boolean. Half, not whole: a sweep places its profile at the
 * nearest point of its spine, and the end of a whole turn stands right above
 * its start.
 *
 * Built with the axis on z (the kernel's helix and sweep frame) and stood up
 * on y at the end.
 */

const AXIS = { point: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 } };
/** z up to y up: (x, y, z) -> (x, z, -y). A point at angle phi from +x towards +y lands at angle -phi from +x towards +z. */
const Z_TO_Y_UP = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];

/** The spring part's exact solid in the shape's own frame, y up. Throws when the kernel cannot build it. */
export function springPartSolid(cad: OcctKernel, part: CadModifierSpringPart): ShapeHandle {
  const { coilRadius, wireRadius, turns, bottom, span } = part;
  if (!(Number.isInteger(turns) && turns >= 1 && wireRadius > 0 && coilRadius > wireRadius && span > 0)) throw new Error("The spring's measures are out of range");
  const pitch = span / turns;
  // A right-hand wire is drawn climbing with the angle from +x towards -z,
  // right-handed about +y. The turn up to y maps that to counter-clockwise
  // about +z seen from above: a right-hand helix here too, and a left-hand
  // one the other way. Its tangent at the start, on +x: (0, +-2 pi r, pitch).
  const leftHanded = part.hand === "left";
  const helix = cad.makeHelixWireHanded({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, pitch, pitch / 2, coilRadius, leftHanded);
  const section = cad.makeWire([cad.makeCircleEdge({ x: coilRadius, y: 0, z: 0 }, { x: 0, y: (leftHanded ? -2 : 2) * Math.PI * coilRadius, z: pitch }, wireRadius)]);
  const swept = cad.getSubShapes(cad.sweepAdvanced(section, helix, { mode: FIXED_UP, up: { x: 0, y: 0, z: 1 } }), "face");
  const wire = swept.filter((face) => cad.surfaceType(face) !== "plane");
  // The disc where the half turn starts; the spring's top end is the same disc
  // a whole number of turns up.
  const discs = swept.filter((face) => cad.surfaceType(face) === "plane");
  const middleZ = (face: ShapeHandle) => {
    const box = cad.getBoundingBox(face);
    return box.zmin + box.zmax;
  };
  const start = discs.reduce<ShapeHandle | undefined>((lowest, face) => (!lowest || middleZ(face) < middleZ(lowest) ? face : lowest), undefined);
  if (wire.length === 0 || !start) throw new Error("The spring's wire did not sweep into a closed half turn");
  const faces: ShapeHandle[] = [];
  for (let index = 0; index < 2 * turns; index += 1) {
    for (const face of wire) faces.push(cad.translate(index % 2 === 0 ? face : cad.rotate(face, AXIS, Math.PI), 0, 0, bottom + (index * pitch) / 2));
  }
  faces.push(cad.translate(start, 0, 0, bottom), cad.translate(start, 0, 0, bottom + span));
  const shells = cad.getSubShapes(cad.sew(faces, Math.max(1e-6, wireRadius * 1e-4)), "shell");
  if (shells.length !== 1) throw new Error(`The spring's turns sewed into ${shells.length} shells`);
  let solid = cad.makeSolid(shells[0]);
  if (!(cad.getVolume(solid) > 0)) solid = cad.makeSolid(cad.reverseShape(shells[0]));
  if (!cad.isValid(solid) || !(cad.getVolume(solid) > 0)) throw new Error("The spring body is not a valid solid");
  return cad.transform(solid, Z_TO_Y_UP);
}
