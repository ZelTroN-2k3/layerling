/**
 * How the editor names its directions (#182). Inside, three.js runs x to the right, y up and z
 * towards the viewer. On screen the numbers follow CAD and similar tools, right-handed: X to the
 * right, Y towards the back, Z up. So the Y a person reads or types is minus the inside z, and a
 * turn about Y is minus the inside turn about z. Everything stored stays as it was.
 */

/** The Y shown for an inside z. */
export function displayY(z: number) {
  return -z || 0;
}

/** The inside z for a Y that was typed. */
export function insideZ(y: number) {
  return -y || 0;
}

/** The turn about Y shown for the inside turn about z (degrees). */
export function displayYTurn(rotationZ: number) {
  return -rotationZ || 0;
}

/** The inside turn about z for a typed turn about Y (degrees). */
export function insideZTurn(yTurn: number) {
  return -yTurn || 0;
}
