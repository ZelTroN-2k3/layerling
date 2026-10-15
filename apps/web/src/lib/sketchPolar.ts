/**
 * Lines drawn by length and angle, as in AutoCAD (#194). The angle is counted counterclockwise
 * from the right as the sketch is seen: the sketch's z runs down the screen, so "up" is -z.
 */

type PlanePoint = { x: number; z: number };

const clean = (value: number) => Math.round(value * 1e6) / 1e6;

/** The line's direction from `origin` to `point` in degrees, 0 to under 360. */
export function sketchLineAngle(origin: PlanePoint, point: PlanePoint) {
  const degrees = (Math.atan2(origin.z - point.z, point.x - origin.x) * 180) / Math.PI;
  const turned = clean(((degrees % 360) + 360) % 360);
  return turned >= 360 ? 0 : turned;
}

/** The point `length` away from `origin` in the direction `degrees`. */
export function sketchPolarPoint(origin: PlanePoint, length: number, degrees: number): PlanePoint {
  const radians = (degrees * Math.PI) / 180;
  return { x: clean(origin.x + Math.cos(radians) * length), z: clean(origin.z - Math.sin(radians) * length) };
}

/**
 * Shift while drawing: the new line turns to the nearest step of `stepDegrees` (15° takes in
 * horizontal and vertical). Its length is what the pointer reaches along that direction, rounded
 * to `lengthStep` when the grid snaps, so a slanted line still ends on a whole millimetre.
 */
export function constrainToAngle(origin: PlanePoint, point: PlanePoint, stepDegrees = 15, lengthStep = 0): PlanePoint {
  const dx = point.x - origin.x;
  const dz = point.z - origin.z;
  if (Math.hypot(dx, dz) < 1e-9) return { ...point };
  const angle = Math.round(sketchLineAngle(origin, point) / stepDegrees) * stepDegrees;
  const radians = (angle * Math.PI) / 180;
  let length = dx * Math.cos(radians) - dz * Math.sin(radians);
  if (lengthStep > 0) length = Math.round(length / lengthStep) * lengthStep;
  return sketchPolarPoint(origin, Math.max(0, length), angle);
}

/**
 * Splits what was typed into the length field: "50<30" carries the angle along, as in AutoCAD;
 * "50" alone leaves the angle to its own field.
 */
export function splitTypedLine(text: string): { length: string; angle: string | null } {
  const index = text.indexOf("<");
  if (index < 0) return { length: text, angle: null };
  return { length: text.slice(0, index), angle: text.slice(index + 1) };
}
