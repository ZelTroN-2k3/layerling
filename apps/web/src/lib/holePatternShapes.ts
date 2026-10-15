import * as THREE from "three";
import { faceFrameWorkplane } from "@/lib/carryOntoFace";
import {
  faceOutlineFromTriangles,
  holeFootprintSize,
  holePatternCenters,
  type FaceOutline,
  type HolePatternSettings,
} from "@/lib/holePattern";
import { placementPatchForNewShape, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { planarFaceTriangles } from "@/lib/rotationPivot";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape, withHoleMode } from "@/lib/workplaneShapes";
import type { ShapeKind, WorkplaneShape } from "@/types/layerling";

type Vec = { x: number; y: number; z: number };

/** How far a hole reaches out of the face and past the far side, so the cut leaves no skin behind. */
export const HOLE_OVERSHOOT = 0.2;

/** A flat face of a body, measured once when it is picked. */
export type PerforableFace = {
  workplane: PlacementWorkplane;
  outline: FaceOutline;
  /** How thick the body is behind the face, along the face's normal. */
  thickness: number;
};

export type FaceReadResult =
  | { ok: true; face: PerforableFace }
  | { ok: false; reason: "noFace" | "curved" };

/**
 * The flat face around a click. `positions` holds the body's world triangles
 * (nine numbers each); the face is the one whose triangle lies nearest to
 * `point` among those that face `normal`. A face of a single facet is a
 * curved surface, not a face to perforate.
 */
export function readPerforableFace(positions: ArrayLike<number>, point: Vec, normal: Vec): FaceReadResult {
  const triangleCount = Math.floor(positions.length / 9);
  const n = new THREE.Vector3(normal.x, normal.y, normal.z);
  if (triangleCount === 0 || n.lengthSq() < 1e-12) return { ok: false, reason: "noFace" };
  n.normalize();

  const p = new THREE.Vector3(point.x, point.y, point.z);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const triangle = new THREE.Triangle();
  const closest = new THREE.Vector3();
  const edgeAB = new THREE.Vector3();
  const edgeAC = new THREE.Vector3();
  let hit = -1;
  let hitDistance = Infinity;
  for (let index = 0; index < triangleCount; index += 1) {
    const o = index * 9;
    a.set(positions[o], positions[o + 1], positions[o + 2]);
    b.set(positions[o + 3], positions[o + 4], positions[o + 5]);
    c.set(positions[o + 6], positions[o + 7], positions[o + 8]);
    edgeAB.subVectors(b, a);
    edgeAC.subVectors(c, a);
    const triangleNormal = edgeAB.clone().cross(edgeAC);
    if (triangleNormal.lengthSq() < 1e-18) continue;
    // The pick's normal and the winding of the mesh may disagree in sign; the plane is what counts.
    if (Math.abs(triangleNormal.normalize().dot(n)) < 0.999) continue;
    triangle.set(a, b, c);
    const distance = triangle.closestPointToPoint(p, closest).distanceTo(p);
    if (distance < hitDistance) {
      hitDistance = distance;
      hit = index;
    }
  }
  if (hit < 0) return { ok: false, reason: "noFace" };

  const face = planarFaceTriangles(positions, hit);
  if (!face || face.triangles.length < 2) return { ok: false, reason: face ? "curved" : "noFace" };

  const workplane = faceFrameWorkplane(point, n);
  // Lay the origin on the face's plane itself, not on whatever the click was slightly off by.
  const o = hit * 9;
  const onPlane = new THREE.Vector3(positions[o], positions[o + 1], positions[o + 2]);
  const offset = n.dot(p.clone().sub(onPlane));
  const origin = p.clone().addScaledVector(n, -offset);
  workplane.origin = { x: origin.x, y: origin.y, z: origin.z };

  const outline = faceOutlineFromTriangles(positions, face.triangles, {
    origin: workplane.origin,
    xAxis: workplane.xAxis,
    zAxis: workplane.zAxis,
  });
  if (!outline) return { ok: false, reason: "noFace" };

  const planeOffset = n.dot(origin);
  let lowest = Infinity;
  for (let index = 0; index < positions.length; index += 3) {
    lowest = Math.min(lowest, n.x * positions[index] + n.y * positions[index + 1] + n.z * positions[index + 2]);
  }
  return { ok: true, face: { workplane, outline, thickness: Math.max(0, planeOffset - lowest) } };
}

const FORM_KIND: Record<HolePatternSettings["form"], ShapeKind> = {
  round: "cylinder",
  square: "box",
  rectangle: "box",
  hexagon: "polygon",
  slot: "slot",
};

/** The depth the holes actually get: the body's thickness plus a skin's worth, or what was asked for. */
export function holeDepth(face: Pick<PerforableFace, "thickness">, settings: Pick<HolePatternSettings, "depth">) {
  return settings.depth === null ? face.thickness + HOLE_OVERSHOOT : settings.depth;
}

export type HolePatternPlan = {
  holes: WorkplaneShape[];
  tooMany: boolean;
};

/**
 * The hole shapes of a pattern on a face: ordinary hole shapes standing on the
 * face, reaching `depth` into the body and a little out of it. Nothing is cut
 * here - grouping them with the body does that, and ungrouping frees them.
 */
export function holePatternShapes(
  face: PerforableFace,
  settings: HolePatternSettings,
  namePrefix: string,
  /** Ids that stay the same from one call to the next, for a preview that is redrawn while the numbers change. */
  previewIdPrefix?: string,
): HolePatternPlan {
  const { centers, tooMany } = holePatternCenters(face.outline, settings);
  if (tooMany || centers.length === 0) return { holes: [], tooMany };

  const kind = FORM_KIND[settings.form];
  const asset = toolbarShapeAssets.find((entry) => entry.kind === kind);
  if (!asset) return { holes: [], tooMany: false };
  const size = holeFootprintSize(settings);
  const depth = holeDepth(face, settings);
  const height = depth + HOLE_OVERSHOOT;
  const { workplane } = face;
  const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
  const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
  const xAxis = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z);
  const zAxis = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z);

  const holes = centers.map((center, index) => {
    const top = origin.clone().addScaledVector(xAxis, center.u).addScaledVector(zAxis, center.v).addScaledVector(normal, HOLE_OVERSHOOT);
    const base = top.clone().addScaledVector(normal, -height);
    const made = makeShapeFromAsset(
      { ...asset, name: `${namePrefix} ${index + 1}` },
      { x: 0, z: 0, elevation: 0 },
      { width: size.width, depth: size.height, height, sides: settings.form === "hexagon" ? 6 : undefined },
    );
    const sized = { ...made, width: size.width, depth: size.height, height, size: Math.max(size.width, size.height) };
    const placed = { ...sized, ...placementPatchForNewShape(sized, workplane, base), ...(previewIdPrefix ? { id: `${previewIdPrefix}-${index}` } : {}) };
    return canonicalizeShape(withHoleMode(placed, true));
  });
  return { holes, tooMany: false };
}
