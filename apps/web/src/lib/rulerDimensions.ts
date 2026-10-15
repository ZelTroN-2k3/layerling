import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";

/** Lage und Masse des Lineal-Koerpers, so wie sie auf der Arbeitsebene stehen. */
export type RulerPose = {
  x: number;
  z: number;
  rotation: number;
  /** Laenge - das ist am Lineal-Koerper das Feld `width`. */
  length: number;
  /** Kreuzbreite quer zur Laenge - am Lineal-Koerper das Feld `depth`. */
  crossWidth: number;
};

/** Lage, Drehung und Masse eines Koerpers, der neben dem Lineal liegen koennte. */
export type RulerCandidatePose = {
  x: number;
  z: number;
  rotation: number;
  rotationX?: number;
  rotationZ?: number;
  width: number;
  height: number;
  depth: number;
};

export type RulerDimensionField = "width" | "height" | "depth";

export type RulerDimensionMatch = {
  /** Abstand des Koerpermittelpunkts von der Lineal-Mitte, entlang der Lineal-Achse (mm). */
  alongOffset: number;
  /** Abstand des Koerpermittelpunkts von der Lineal-Mittellinie, quer zur Achse (mm, mit Vorzeichen). */
  acrossOffset: number;
  /** Die volle Ausdehnung des Koerpers entlang der Lineal-Achse (mm). */
  extentAlong: number;
  /**
   * Welches eigene Feld des Koerpers dieser Ausdehnung entspricht - nur gesetzt,
   * wenn eine seiner drei Achsen (innerhalb der Toleranz) parallel zur
   * Lineal-Achse steht. Sonst ist die Ausdehnung eine Diagonale und gehoert zu
   * keiner einzelnen Eigenschaft, also nicht eintippbar.
   */
  alignedField: RulerDimensionField | null;
};

const ALIGNMENT_TOLERANCE_DEGREES = 2;
const ALIGNMENT_COS_TOLERANCE = Math.cos(THREE.MathUtils.degToRad(ALIGNMENT_TOLERANCE_DEGREES));

/**
 * Ob und wie ein Koerper das Band eines Lineals kreuzt. Reine Projektions-
 * rechnung auf der Arbeitsebene (Hoehe/y spielt keine Rolle, ein Lineal liest
 * nur die Grundflaeche) - unabhaengig von Koerperart, damit sie fuer ein
 * Gewinde oder eine Gruppe genauso gilt wie fuer einen Quader.
 */
export function rulerDimensionMatch(ruler: RulerPose, candidate: RulerCandidatePose): RulerDimensionMatch | null {
  const rulerQuaternion = quaternionForShape(ruler);
  const axisAlong = new THREE.Vector3(1, 0, 0).applyQuaternion(rulerQuaternion);
  const axisAcross = new THREE.Vector3(0, 0, 1).applyQuaternion(rulerQuaternion);

  const candidateQuaternion = quaternionForShape(candidate);
  const candidateAxes: Array<{ field: RulerDimensionField; direction: THREE.Vector3; half: number }> = [
    { field: "width", direction: new THREE.Vector3(1, 0, 0).applyQuaternion(candidateQuaternion), half: candidate.width / 2 },
    { field: "height", direction: new THREE.Vector3(0, 1, 0).applyQuaternion(candidateQuaternion), half: candidate.height / 2 },
    { field: "depth", direction: new THREE.Vector3(0, 0, 1).applyQuaternion(candidateQuaternion), half: candidate.depth / 2 },
  ];

  const extentAlongHalf = candidateAxes.reduce((sum, axis) => sum + Math.abs(axis.direction.dot(axisAlong)) * axis.half, 0);
  const extentAcrossHalf = candidateAxes.reduce((sum, axis) => sum + Math.abs(axis.direction.dot(axisAcross)) * axis.half, 0);

  const relative = new THREE.Vector3(candidate.x - ruler.x, 0, candidate.z - ruler.z);
  const acrossOffset = relative.dot(axisAcross);
  if (Math.abs(acrossOffset) > ruler.crossWidth / 2 + extentAcrossHalf) {
    return null;
  }

  const aligned = candidateAxes.find((axis) => Math.abs(axis.direction.dot(axisAlong)) >= ALIGNMENT_COS_TOLERANCE);

  return {
    alongOffset: relative.dot(axisAlong),
    acrossOffset,
    extentAlong: extentAlongHalf * 2,
    alignedField: aligned?.field ?? null,
  };
}

/** Weltkoordinaten (x, z) eines Punkts, der auf der Lineal-Achse im Abstand `alongOffset` von dessen Mitte liegt. */
export function pointAlongRuler(ruler: RulerPose, alongOffset: number): { x: number; z: number } {
  const axisAlong = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternionForShape(ruler));
  return { x: ruler.x + axisAlong.x * alongOffset, z: ruler.z + axisAlong.z * alongOffset };
}

/** Lage und Armlaengen des Winkellineals, so wie es auf der Arbeitsebene steht. */
export type CornerRulerPose = {
  x: number;
  z: number;
  rotation: number;
  /** Laenge des ersten Arms (lokale X-Achse) - am Koerper das Feld `width`. */
  armLengthX: number;
  /** Laenge des zweiten Arms (lokale Z-Achse) - am Koerper das Feld `depth`. */
  armLengthZ: number;
  /** Kreuzbreite beider Arme. */
  armWidth: number;
};

/**
 * Die Ecke, an der sich beide Arme treffen - anders als beim geraden Lineal ist
 * `x`/`z` des Winkellineals die Mitte der Bounding-Box (wie bei jeder anderen
 * Form, damit Zieh-Griffe/Auswahl keine Sonderbehandlung brauchen), nicht der
 * Nullpunkt der Skala. Die Ecke ist ein abgeleiteter Punkt, eine halbe
 * Armlaenge je Achse von der Mitte entfernt, in Richtung der eigenen Drehung.
 */
export function cornerRulerCorner(pose: CornerRulerPose): { x: number; z: number } {
  const quaternion = quaternionForShape({ rotation: pose.rotation });
  const local = new THREE.Vector3(-pose.armLengthX / 2, 0, -pose.armLengthZ / 2).applyQuaternion(quaternion);
  return { x: pose.x + local.x, z: pose.z + local.z };
}

/**
 * Wie `rulerDimensionMatch`, aber fuer beide Arme des Winkellineals auf einmal -
 * ruft die bestehende Funktion zweimal auf, einmal je Arm-Richtung (0 Grad bzw.
 * 90 Grad zur eigenen Drehung), von der gemeinsamen Ecke aus. Keine Aenderung an
 * `rulerDimensionMatch` noetig, weil sie schon eine freie Pose entgegennimmt statt
 * eines tatsaechlichen Lineal-Koerpers.
 */
export function cornerRulerDimensionMatches(pose: CornerRulerPose, candidate: RulerCandidatePose): {
  armX: RulerDimensionMatch | null;
  armZ: RulerDimensionMatch | null;
} {
  const corner = cornerRulerCorner(pose);
  return cornerRulerDimensionMatchesFromCorner(corner, pose.rotation, pose.armLengthX, pose.armLengthZ, pose.armWidth, candidate);
}

/**
 * Wie `cornerRulerDimensionMatches`, aber wenn der Ursprungspunkt schon die
 * Ecke selbst ist statt der Bounding-Box-Mitte einer Form - so sitzt das
 * platzierte Winkellineal-Werkzeug, das direkt an seiner Ecke gesetzt wird,
 * nicht an einer daraus abgeleiteten Mitte.
 */
export function cornerRulerDimensionMatchesFromCorner(
  corner: { x: number; z: number },
  rotation: number,
  armLengthX: number,
  armLengthZ: number,
  armWidth: number,
  candidate: RulerCandidatePose,
): { armX: RulerDimensionMatch | null; armZ: RulerDimensionMatch | null } {
  const armX = rulerDimensionMatch({ x: corner.x, z: corner.z, rotation, length: armLengthX, crossWidth: armWidth }, candidate);
  const armZ = rulerDimensionMatch({ x: corner.x, z: corner.z, rotation: rotation + 90, length: armLengthZ, crossWidth: armWidth }, candidate);
  return { armX, armZ };
}

/**
 * Teilstriche fuer einen Arm des Winkellineal-Werkzeugs, einer je Millimeter -
 * dieselbe Dichte wie die verworfene Tick-Textur (`createRulerTickTexture`),
 * nur als reine Zahlenliste statt als Zeichnung, damit die Bildschirm-Anzeige
 * jeden Strich einzeln ueber `projectToScreen` platzieren kann.
 */
export type CornerRulerTick = {
  offset: number;
  isTen: boolean;
  isFive: boolean;
};

export function cornerRulerTicks(length: number): CornerRulerTick[] {
  const ticks: CornerRulerTick[] = [];
  const last = Math.max(0, Math.floor(length));
  for (let value = 0; value <= last; value += 1) {
    ticks.push({ offset: value, isTen: value % 10 === 0, isFive: value % 5 === 0 });
  }
  return ticks;
}

export type CornerRulerMode = "endpoint" | "midpoint";

type CornerRulerVector = { x: number; y: number; z: number };

/**
 * The plane a framing square lies in: its two arms and the direction its
 * height counts in. On the plate that is the plate itself, on a face
 * workplane the face (#105).
 */
export type CornerRulerFrame = {
  xAxis: CornerRulerVector;
  zAxis: CornerRulerVector;
  normal: CornerRulerVector;
};

const toVector = (value: CornerRulerVector) => new THREE.Vector3(value.x, value.y, value.z);
const fromVector = (value: THREE.Vector3): CornerRulerVector => ({
  x: Math.abs(value.x) < 1e-12 ? 0 : value.x,
  y: Math.abs(value.y) < 1e-12 ? 0 : value.y,
  z: Math.abs(value.z) < 1e-12 ? 0 : value.z,
});

/** The frame turned by a quarter turn about its normal, as a click on the handle does. */
export function rotateCornerRulerFrame(frame: CornerRulerFrame): CornerRulerFrame {
  const normal = toVector(frame.normal).normalize();
  return {
    xAxis: fromVector(toVector(frame.xAxis).applyAxisAngle(normal, Math.PI / 2)),
    zAxis: fromVector(toVector(frame.zAxis).applyAxisAngle(normal, Math.PI / 2)),
    normal: fromVector(normal),
  };
}

/**
 * The frame a framing square starts with on a workplane: the workplane's own
 * axes, turned a quarter as on the plate, where it has always started at 90 degrees.
 */
export function cornerRulerFrameForWorkplane(workplane: { xAxis: CornerRulerVector; zAxis: CornerRulerVector; normal: CornerRulerVector }): CornerRulerFrame {
  return rotateCornerRulerFrame({ xAxis: workplane.xAxis, zAxis: workplane.zAxis, normal: workplane.normal });
}

/**
 * The turn about the vertical of a frame that lies flat on the plate the right
 * way up, in degrees; null for any other frame. The measurements of shapes at
 * the arms only work on the plate.
 */
export function cornerRulerFlatRotation(frame: CornerRulerFrame): number | null {
  const { xAxis, zAxis, normal } = frame;
  if (Math.abs(normal.y - 1) > 1e-6 || Math.abs(xAxis.y) > 1e-6 || Math.abs(zAxis.y) > 1e-6) return null;
  const rotation = THREE.MathUtils.radToDeg(Math.atan2(-xAxis.z, xAxis.x));
  // z must be x turned a quarter the same way as in quaternionForShape.
  const expectedZ = { x: Math.sin(THREE.MathUtils.degToRad(rotation)), z: Math.cos(THREE.MathUtils.degToRad(rotation)) };
  if (Math.abs(zAxis.x - expectedZ.x) > 1e-6 || Math.abs(zAxis.z - expectedZ.z) > 1e-6) return null;
  return ((rotation % 360) + 360) % 360;
}

/** How far to move shapes so their distance along one of the frame's directions changes by `delta`. */
export function cornerRulerShiftVector(frame: CornerRulerFrame, axis: "x" | "z" | "elevation", delta: number): CornerRulerVector {
  const direction = axis === "x" ? frame.xAxis : axis === "z" ? frame.zAxis : frame.normal;
  return fromVector(toVector(direction).normalize().multiplyScalar(delta));
}

export type CornerRulerCoordinateInput = {
  rulerCorner: { x: number; y?: number; z: number };
  rulerRotation: number;
  /** The plane the square lies in; when given it replaces `rulerRotation`. */
  frame?: CornerRulerFrame;
  mode?: CornerRulerMode;
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
};

export type CornerRulerRelativeCoordinates = {
  mode: CornerRulerMode;
  x: number;
  z: number;
  elevation: number;
  rulerOriginWorld: { x: number; y: number; z: number };
  axisXDirection: { x: number; y: number; z: number };
  axisZDirection: { x: number; y: number; z: number };
  xEndpointOnAxis: { x: number; y: number; z: number };
  zEndpointOnAxis: { x: number; y: number; z: number };
  xTargetPoint: { x: number; y: number; z: number };
  zTargetPoint: { x: number; y: number; z: number };
  elevationBasePoint: { x: number; y: number; z: number };
  elevationTargetPoint: { x: number; y: number; z: number };
};

export function computeCornerRulerRelativeCoordinates(
  input: CornerRulerCoordinateInput
): CornerRulerRelativeCoordinates {
  const mode: CornerRulerMode = input.mode === "midpoint" ? "midpoint" : "endpoint";
  const rulerQuat = quaternionForShape({ rotation: input.rulerRotation });
  const axisX = input.frame ? toVector(input.frame.xAxis).normalize() : new THREE.Vector3(1, 0, 0).applyQuaternion(rulerQuat);
  const axisZ = input.frame ? toVector(input.frame.zAxis).normalize() : new THREE.Vector3(0, 0, 1).applyQuaternion(rulerQuat);
  const axisY = input.frame ? toVector(input.frame.normal).normalize() : new THREE.Vector3(0, 1, 0);

  const rulerCorner = new THREE.Vector3(input.rulerCorner.x, input.rulerCorner.y ?? 0, input.rulerCorner.z);
  const { min, max } = input.bounds;

  let x: number;
  let z: number;
  let elevation: number;

  if (mode === "midpoint") {
    x = (min.x + max.x) / 2;
    z = (min.z + max.z) / 2;
    elevation = (min.y + max.y) / 2;
  } else {
    x = min.x;
    z = min.z;
    elevation = min.y;
  }

  const xEndpointOnAxis = rulerCorner.clone().addScaledVector(axisX, x);
  const zEndpointOnAxis = rulerCorner.clone().addScaledVector(axisZ, z);

  const xTargetPoint = rulerCorner
    .clone()
    .addScaledVector(axisX, x)
    .addScaledVector(axisZ, z)
    .addScaledVector(axisY, elevation);

  const zTargetPoint = xTargetPoint.clone();

  const elevationBasePoint = rulerCorner
    .clone()
    .addScaledVector(axisX, max.x)
    .addScaledVector(axisZ, mode === "midpoint" ? z : min.z);

  const elevationTargetPoint = elevationBasePoint
    .clone()
    .addScaledVector(axisY, elevation);

  return {
    mode,
    x,
    z,
    elevation,
    rulerOriginWorld: { x: rulerCorner.x, y: rulerCorner.y, z: rulerCorner.z },
    axisXDirection: { x: axisX.x, y: axisX.y, z: axisX.z },
    axisZDirection: { x: axisZ.x, y: axisZ.y, z: axisZ.z },
    xEndpointOnAxis: { x: xEndpointOnAxis.x, y: xEndpointOnAxis.y, z: xEndpointOnAxis.z },
    zEndpointOnAxis: { x: zEndpointOnAxis.x, y: zEndpointOnAxis.y, z: zEndpointOnAxis.z },
    xTargetPoint: { x: xTargetPoint.x, y: xTargetPoint.y, z: xTargetPoint.z },
    zTargetPoint: { x: zTargetPoint.x, y: zTargetPoint.y, z: zTargetPoint.z },
    elevationBasePoint: { x: elevationBasePoint.x, y: elevationBasePoint.y, z: elevationBasePoint.z },
    elevationTargetPoint: { x: elevationTargetPoint.x, y: elevationTargetPoint.y, z: elevationTargetPoint.z },
  };
}

export function computeCornerRulerShift(
  rulerRotation: number,
  axis: "x" | "z",
  delta: number
): { x: number; z: number } {
  const rulerQuat = quaternionForShape({ rotation: rulerRotation });
  const dir = axis === "x"
    ? new THREE.Vector3(1, 0, 0).applyQuaternion(rulerQuat)
    : new THREE.Vector3(0, 0, 1).applyQuaternion(rulerQuat);
  const shift = dir.multiplyScalar(delta);
  return { x: shift.x, z: shift.z };
}

