type Direction = { x: number; y: number; z: number };

const dot = (a: Direction, b: Direction) => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Which workplane axis an arrow key moves along, given how the view is
 * turned. Left and right go along the axis that points most to the right on
 * the screen, up and down along the other one - up away from the viewer, as
 * on the screen. Without a view (no camera yet) the keys keep the plane's own
 * axes: right is +x, up is -z.
 *
 * `deltaX` is the step of the left/right keys (right positive), `deltaZ` of
 * the up/down keys (down positive, towards the viewer). The result is the
 * step along the workplane's x and z axis.
 */
export function screenAlignedNudge(
  workplane: { xAxis: Direction; zAxis: Direction },
  deltaX: number,
  deltaZ: number,
  screen?: { right: Direction; away: Direction },
): { xStep: number; zStep: number } {
  if (!screen) return { xStep: deltaX, zStep: deltaZ };
  const rightOnX = dot(screen.right, workplane.xAxis);
  const rightOnZ = dot(screen.right, workplane.zAxis);
  const rightIsX = Math.abs(rightOnX) >= Math.abs(rightOnZ);
  const rightSign = Math.sign(rightIsX ? rightOnX : rightOnZ) || 1;
  // The up/down keys use the other axis; which way along it is "away".
  const awayOnOther = dot(screen.away, rightIsX ? workplane.zAxis : workplane.xAxis);
  const awaySign = Math.sign(awayOnOther) || (rightIsX ? -1 : 1);
  let xStep = 0;
  let zStep = 0;
  if (rightIsX) {
    xStep += rightSign * deltaX;
    zStep += -awaySign * deltaZ;
  } else {
    zStep += rightSign * deltaX;
    xStep += -awaySign * deltaZ;
  }
  return { xStep, zStep };
}
