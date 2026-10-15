import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { WorkplaneShape } from "@/types/layerling";
import { roundSideCount } from "@/lib/roundSideCount";

/*
 * Das druckbare Scharnier (print-in-place): zwei Blaetter, die flach
 * aufgeklappt auf der Platte liegen, abwechselnde Knoechel auf der Achse und
 * ein Stift, der mit dem ersten Blatt verwachsen ist und mit Spiel durch die
 * Knoechel des zweiten laeuft. Gedruckt wird es in einem Stueck und bewegt
 * sich danach.
 *
 * Breite ist die Laenge entlang der Achse (x), Tiefe beide Blaetter zusammen
 * (z, Blatt A hinten bei -z, Blatt B vorn bei +z), Hoehe der Durchmesser der
 * Knoechel. Die Blaetter liegen unten (y = 0) mit ihrer Staerke. Knoechel
 * Nummer 0, 2, 4 ... gehoeren zu A, 1, 3 ... zu B; die Zahl ist ungerade, so
 * sitzt A an beiden Enden und haelt den Stift.
 *
 * Damit die Teile nicht verwachsen, hat B um den Stift eine Bohrung mit
 * Spiel, zwischen den Knoecheln bleibt ein Spalt in Spielbreite, und jedes
 * Blatt endet unter den Knoecheln des anderen um das Spiel vor ihnen. Die
 * Blattstaerke ist so begrenzt, dass ein Blatt unter der Bohrung bleibt.
 */

export const DEFAULT_HINGE_WIDTH = 40;
export const DEFAULT_HINGE_DEPTH = 40;
export const DEFAULT_HINGE_HEIGHT = 8;
export const DEFAULT_HINGE_KNUCKLES = 5;
export const DEFAULT_HINGE_PIN_DIAMETER = 3;
export const DEFAULT_HINGE_LEAF_THICKNESS = 2;
export const DEFAULT_HINGE_CLEARANCE = 0.4;
export const MIN_HINGE_KNUCKLES = 3;
export const MAX_HINGE_KNUCKLES = 15;
export const MIN_HINGE_CLEARANCE = 0.1;
export const MAX_HINGE_CLEARANCE = 1;
const MIN_LEAF = 0.4;
const MIN_KNUCKLE_LENGTH = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export function normalizeHingeClearance(value?: number) {
  return clamp(finite(value, DEFAULT_HINGE_CLEARANCE), MIN_HINGE_CLEARANCE, MAX_HINGE_CLEARANCE);
}

/** An odd count between 3 and 15, fewer when the knuckles would get shorter than 1 mm. */
export function normalizeHingeKnuckles(value: number | undefined, width = DEFAULT_HINGE_WIDTH, clearance = DEFAULT_HINGE_CLEARANCE) {
  let count = Math.round(finite(value, DEFAULT_HINGE_KNUCKLES));
  if (count % 2 === 0) count += 1;
  count = clamp(count, MIN_HINGE_KNUCKLES, MAX_HINGE_KNUCKLES);
  while (count > MIN_HINGE_KNUCKLES && (width - (count - 1) * clearance) / count < MIN_KNUCKLE_LENGTH) count -= 2;
  return count;
}

/** The pin keeps a wall of at least 0.4 mm around its bore in B's knuckles. */
export function normalizeHingePinDiameter(value: number | undefined, height: number, clearance = DEFAULT_HINGE_CLEARANCE) {
  const radius = Math.max(0.5, height / 2);
  const max = Math.max(0.2, 2 * (radius - clearance - MIN_LEAF));
  return clamp(finite(value, Math.min(DEFAULT_HINGE_PIN_DIAMETER, height * 0.4)), Math.min(0.2, max), max);
}

/** A leaf stays below B's bore: no thicker than the knuckle's radius less bore radius. */
export function normalizeHingeLeafThickness(value: number | undefined, height: number, pinDiameter: number, clearance = DEFAULT_HINGE_CLEARANCE) {
  const radius = Math.max(0.5, height / 2);
  const max = Math.max(0.1, radius - pinDiameter / 2 - clearance);
  return clamp(finite(value, DEFAULT_HINGE_LEAF_THICKNESS), Math.min(MIN_LEAF, max), max);
}

/** The depth below which a leaf would not reach past the other part's knuckles. */
export function minimumHingeDepth(height: number, leaf: number, clearance: number) {
  const radius = height / 2;
  const start = Math.sqrt((radius + clearance) * (radius + clearance) - (radius - leaf) * (radius - leaf));
  return 2 * (start + 0.5);
}

export type HingeShapeFields = Pick<WorkplaneShape, "width" | "height"> & {
  depth?: number;
  hingeKnuckles?: number;
  hingePinDiameter?: number;
  hingeLeafThickness?: number;
  hingeClearance?: number;
  sides?: number;
};

/** Everything the body is built from, in the shape's own frame (x along the axis, y up from 0, z across). */
export function hingePlan(shape: HingeShapeFields) {
  const width = Math.max(1, shape.width);
  const height = Math.max(1, shape.height);
  const radius = height / 2;
  const clearance = normalizeHingeClearance(shape.hingeClearance);
  const pinDiameter = normalizeHingePinDiameter(shape.hingePinDiameter, height, clearance);
  const pinRadius = pinDiameter / 2;
  const boreRadius = pinRadius + clearance;
  const leaf = normalizeHingeLeafThickness(shape.hingeLeafThickness, height, pinDiameter, clearance);
  const knuckles = normalizeHingeKnuckles(shape.hingeKnuckles, width, clearance);
  const knuckleLength = (width - (knuckles - 1) * clearance) / knuckles;
  // Where the top of a leaf meets the knuckle's outside, and where the other leaf may end.
  const chord = Math.sqrt(Math.max(0, radius * radius - (radius - leaf) * (radius - leaf)));
  // The leaf's top corner is where it comes closest to the round knuckle:
  // the clearance has to hold there, not just level with the leaf.
  const leafStart = Math.sqrt((radius + clearance) * (radius + clearance) - (radius - leaf) * (radius - leaf));
  // Each leaf keeps at least half a millimetre beyond the other's knuckles.
  const depth = Math.max(minimumHingeDepth(height, leaf, clearance), shape.depth ?? shape.width);
  const segments = Array.from({ length: knuckles }, (_, index) => {
    const x0 = -width / 2 + index * (knuckleLength + clearance);
    return { x0, x1: x0 + knuckleLength, owner: index % 2 === 0 ? "a" as const : "b" as const };
  });
  // A multiple of four puts a corner exactly at the bottom of every circle.
  const sides = Math.max(16, Math.ceil(roundSideCount(shape.sides, height, height) / 4) * 4);
  return { width, depth, height, radius, clearance, pinRadius, boreRadius, leaf, knuckles, knuckleLength, chord, leafStart, segments, sides };
}

export type HingePlan = ReturnType<typeof hingePlan>;

type P = { u: number; v: number };

function circle(plan: HingePlan, r: number): P[] {
  return Array.from({ length: plan.sides }, (_, k) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / plan.sides;
    return { u: r * Math.cos(angle), v: plan.radius + r * Math.sin(angle) };
  });
}

/** The knuckle's outside from angle `from` to `to` (radians, increasing), its corners in between. */
function arc(plan: HingePlan, from: number, to: number): P[] {
  const points: P[] = [];
  for (let k = 0; k <= plan.sides * 2; k += 1) {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / plan.sides;
    if (angle > from + 1e-9 && angle < to - 1e-9) points.push({ u: plan.radius * Math.cos(angle), v: plan.radius + plan.radius * Math.sin(angle) });
  }
  return points;
}

/** The sections every body is made of, counter-clockwise in (u = z, v = y). */
export function hingeSections(plan: HingePlan) {
  const { depth, leaf, chord, leafStart: e } = plan;
  const half = depth / 2;
  const right = Math.asin((leaf - plan.radius) / plan.radius); // where a leaf top meets the knuckle on +z
  const left = Math.PI - right;
  const bottom = { u: 0, v: 0 };
  const arcA = arc(plan, -Math.PI / 2, left);
  const arcB = arc(plan, right, (3 * Math.PI) / 2);
  return {
    // A's knuckle with its leaf, the pin inside it.
    aFull: [{ u: -half, v: 0 }, { u: -e, v: 0 }, bottom, ...arcA, { u: -chord, v: leaf }, { u: -e, v: leaf }, { u: -half, v: leaf }],
    aCap: [{ u: -e, v: 0 }, bottom, ...arcA, { u: -chord, v: leaf }, { u: -e, v: leaf }],
    aLeaf: [{ u: -half, v: 0 }, { u: -e, v: 0 }, { u: -e, v: leaf }, { u: -half, v: leaf }],
    pin: circle(plan, plan.pinRadius),
    bFull: [bottom, { u: e, v: 0 }, { u: half, v: 0 }, { u: half, v: leaf }, { u: e, v: leaf }, { u: chord, v: leaf }, ...arcB],
    bCap: [bottom, { u: e, v: 0 }, { u: e, v: leaf }, { u: chord, v: leaf }, ...arcB],
    bLeaf: [{ u: e, v: 0 }, { u: half, v: 0 }, { u: half, v: leaf }, { u: e, v: leaf }],
    bore: circle(plan, plan.boreRadius),
  };
}

type Vec3 = [number, number, number];

/**
 * The display body: both parts as closed, watertight triangle meshes, built in
 * slices along the axis. Each slice is a section pushed from x0 to x1; where
 * the section changes, the cap between them is the part that ends.
 */
export function hingeTriangles(shape: HingeShapeFields) {
  const plan = hingePlan(shape);
  const s = hingeSections(plan);
  const triangles: Vec3[][] = [];
  const at = (x: number, p: P): Vec3 => [x, p.v, p.u];
  const push = (a: Vec3, b: Vec3, c: Vec3, want: Vec3) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    triangles.push(n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 ? [a, b, c] : [a, c, b]);
  };
  const walls = (loop: P[], x0: number, x1: number, inward = false) => {
    loop.forEach((p, i) => {
      const q = loop[(i + 1) % loop.length];
      const du = q.u - p.u;
      const dv = q.v - p.v;
      const sign = inward ? -1 : 1;
      const want: Vec3 = [0, -du * sign, dv * sign];
      push(at(x0, p), at(x1, p), at(x1, q), want);
      push(at(x0, p), at(x1, q), at(x0, q), want);
    });
  };
  const cap = (outer: P[], holes: P[][], x: number, direction: 1 | -1) => {
    const contour = outer.map((p) => new THREE.Vector2(p.u, p.v));
    const holeVectors = holes.map((hole) => hole.map((p) => new THREE.Vector2(p.u, p.v)));
    const all = [...outer, ...holes.flat()];
    THREE.ShapeUtils.triangulateShape(contour, holeVectors).forEach(([a, b, c]) => push(at(x, all[a]), at(x, all[b]), at(x, all[c]), [direction, 0, 0]));
  };
  const left = -plan.width / 2;
  const rightEnd = plan.width / 2;

  // Part A: knuckles with the pin, joined by the pin and the leaf in between.
  const a = plan.segments.filter((segment) => segment.owner === "a");
  a.forEach((segment, index) => {
    walls(s.aFull, segment.x0, segment.x1);
    if (index === 0) cap(s.aFull, [], left, -1);
    else cap(s.aCap, [s.pin], segment.x0, -1);
    if (index === a.length - 1) cap(s.aFull, [], rightEnd, 1);
    else {
      cap(s.aCap, [s.pin], segment.x1, 1);
      const next = a[index + 1];
      walls(s.aLeaf, segment.x1, next.x0);
      walls(s.pin, segment.x1, next.x0);
    }
  });

  // Part B: its leaf runs the whole length, its knuckles carry the bore.
  const b = plan.segments.filter((segment) => segment.owner === "b");
  let x = left;
  cap(s.bLeaf, [], left, -1);
  b.forEach((segment) => {
    walls(s.bLeaf, x, segment.x0);
    cap(s.bCap, [s.bore], segment.x0, -1);
    walls(s.bFull, segment.x0, segment.x1);
    walls(s.bore, segment.x0, segment.x1, true);
    cap(s.bCap, [s.bore], segment.x1, 1);
    x = segment.x1;
  });
  walls(s.bLeaf, x, rightEnd);
  cap(s.bLeaf, [], rightEnd, 1);
  return triangles;
}

/** A closed, watertight hinge from y = 0 to y = height, centred on x and z. */
export function createHingeGeometry(shape: HingeShapeFields): THREE.BufferGeometry {
  const positions: number[] = [];
  hingeTriangles(shape).forEach((triangle) => triangle.forEach((vertex) => positions.push(...vertex)));
  const raw = new THREE.BufferGeometry();
  raw.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const geometry = toCreasedNormals(raw, THREE.MathUtils.degToRad(30));
  raw.dispose();
  geometry.computeBoundingBox();
  return geometry;
}

/**
 * The exact body in parts the CAD kernel already knows - boxes, lying
 * cylinders and lying tubes - in the shape's own frame: x along the axis,
 * `elevation` from the bottom of the shape, before its own turn. Overlapping
 * parts are fused into the two bodies.
 */
export function hingeLocalParts(shape: HingeShapeFields): Array<Pick<WorkplaneShape, "kind" | "x" | "z" | "elevation" | "width" | "depth" | "height" | "rotationZ" | "bevel">> {
  const plan = hingePlan(shape);
  const { width, depth, radius, leaf, leafStart: e, knuckleLength, pinRadius, boreRadius } = plan;
  const leafDepth = depth / 2 - e;
  // A cylinder or tube lies along x when turned 90 degrees about z; its height is then its length.
  const lying = (x: number, diameter: number, length: number) => ({ x, z: 0, elevation: radius - length / 2, width: diameter, depth: diameter, height: length, rotationZ: 90 });
  const parts: Array<Pick<WorkplaneShape, "kind" | "x" | "z" | "elevation" | "width" | "depth" | "height" | "rotationZ" | "bevel">> = [
    { kind: "box", x: 0, z: -(depth / 2 + e) / 2, elevation: 0, width, depth: leafDepth, height: leaf },
    { kind: "box", x: 0, z: (depth / 2 + e) / 2, elevation: 0, width, depth: leafDepth, height: leaf },
    { kind: "cylinder", ...lying(0, pinRadius * 2, width) },
  ];
  plan.segments.forEach((segment) => {
    const center = (segment.x0 + segment.x1) / 2;
    if (segment.owner === "a") {
      parts.push({ kind: "cylinder", ...lying(center, radius * 2, knuckleLength) });
      parts.push({ kind: "box", x: center, z: -e / 2, elevation: 0, width: knuckleLength, depth: e, height: leaf });
    } else {
      parts.push({ kind: "tube", ...lying(center, radius * 2, knuckleLength), bevel: radius - boreRadius });
      parts.push({ kind: "box", x: center, z: e / 2, elevation: 0, width: knuckleLength, depth: e, height: leaf });
    }
  });
  return parts;
}
