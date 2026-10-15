/**
 * Patterns: the selection repeated n times in a row or around a circle - hole
 * rows, bolt circles, the teeth of a ring, and with a rise or a growing radius
 * stairs, screws and spirals. Pure numbers; the editor turns them into copies.
 *
 * Coordinates as the user sees them, like a slicer: X to the right, Y to the
 * back, Z up. In the scene that is x, -z and y.
 */
export type ArrayMode = "row" | "circle";
export type ArrayDirection = "x" | "y" | "z";

export type ArraySettings = {
  mode: ArrayMode;
  /** Pieces in the pattern, the original included. */
  count: number;
  /** Row: centre to centre along X, Y and Z (up) at once; negative runs the other way. */
  spacingX: number;
  spacingY: number;
  spacingZ: number;
  /** Circle: the angle the pattern spans; 360 closes the ring. */
  angle: number;
  /** Circle centre in user coordinates (X, Y). */
  centerX: number;
  centerY: number;
  /** Circle: turn each copy with the circle, like teeth, or keep it as it is. */
  rotateCopies: boolean;
  /** Circle: height gained per copy; a climbing circle is a screw. */
  rise: number;
  /** Circle: distance from the centre gained per copy; positive widens, negative tightens (a spiral). */
  radiusChange: number;
};

export const ARRAY_MIN_COUNT = 2;
export const ARRAY_MAX_COUNT = 100;

export function clampArrayCount(count: number) {
  if (!Number.isFinite(count)) return ARRAY_MIN_COUNT;
  return Math.min(ARRAY_MAX_COUNT, Math.max(ARRAY_MIN_COUNT, Math.round(count)));
}

/** The three spacings of a row that steps `spacing` along one axis only - what a row was before it could use all three. */
export function singleAxisSpacing(direction: ArrayDirection, spacing: number) {
  return {
    spacingX: direction === "x" ? spacing : 0,
    spacingY: direction === "y" ? spacing : 0,
    spacingZ: direction === "z" ? spacing : 0,
  };
}

/** Scene offset of the copy at `index` (1 = first copy) in a row. */
export function rowOffset(settings: Pick<ArraySettings, "spacingX" | "spacingY" | "spacingZ">, index: number) {
  // Y points to the back, which is -z in the scene; Z (up) is y.
  return { dx: settings.spacingX * index, dy: settings.spacingZ * index, dz: -settings.spacingY * index || 0 };
}

/**
 * A scene point, already turned to its place on the circle, moved away from or
 * towards the centre by `amount` along the line from the centre. A point that
 * sits on the centre has no direction of its own, so it goes the way the
 * circle has turned (`degrees` from X). This is what makes a spiral.
 */
export function moveAlongRadius(point: { x: number; z: number }, center: { x: number; y: number }, degrees: number, amount: number) {
  if (!amount) return { x: point.x, z: point.z };
  const relX = point.x - center.x;
  const relY = -point.z - center.y;
  const distance = Math.hypot(relX, relY);
  const radians = (degrees * Math.PI) / 180;
  const dirX = distance > 1e-9 ? relX / distance : Math.cos(radians);
  const dirY = distance > 1e-9 ? relY / distance : Math.sin(radians);
  return { x: center.x + dirX * (distance + amount), z: -(center.y + dirY * (distance + amount)) };
}

/**
 * Angle between neighbours on a circle. A full circle shares 360° among all
 * pieces - the last copy must not land on the original; an arc puts the first
 * and last piece on its two ends.
 */
export function circleStepDegrees(count: number, angle: number) {
  const pieces = clampArrayCount(count);
  const full = Math.abs(Math.abs(angle) - 360) < 1e-9 || Math.abs(angle) > 360;
  return full ? 360 / pieces * Math.sign(angle || 1) : angle / (pieces - 1);
}

/**
 * A scene point turned about the vertical axis through the centre (given in
 * user coordinates). Positive angles run counter-clockwise seen from above.
 */
export function rotateAroundVertical(point: { x: number; z: number }, center: { x: number; y: number }, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  // In user coordinates X = x and Y = -z; turn there, then go back.
  const relX = point.x - center.x;
  const relY = -point.z - center.y;
  const nextX = relX * cos - relY * sin;
  const nextY = relX * sin + relY * cos;
  return { x: center.x + nextX, z: -(center.y + nextY) };
}
