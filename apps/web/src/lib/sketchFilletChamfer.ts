import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

type IdFactory = (prefix: string) => string;

export type CornerTreatmentResult = {
  profile: SketchProfile;
  newPointIds: [string, string];
};

export type CornerGeometryInfo = {
  point: SketchPoint;
  seg1: SketchSegment;
  seg2: SketchSegment;
  p1: SketchPoint;
  p2: SketchPoint;
  v1: { x: number; z: number };
  v2: { x: number; z: number };
  len1: number;
  len2: number;
  angleRad: number;
};

export function getCornerGeometryInfo(profile: SketchProfile, pointId: string): CornerGeometryInfo | null {
  const point = profile.points.find((p) => p.id === pointId);
  if (!point) return null;

  const connected = profile.segments.filter((s) => !s.construction && (s.startId === pointId || s.endId === pointId));
  if (connected.length !== 2) return null;

  const [seg1, seg2] = connected;
  // Only a corner between two straight lines: pulling the end of a curve back
  // along its chord would leave its handles behind and bend the curve.
  if ((seg1.kind ?? "line") !== "line" || (seg2.kind ?? "line") !== "line") return null;
  const otherId1 = seg1.startId === pointId ? seg1.endId : seg1.startId;
  const otherId2 = seg2.startId === pointId ? seg2.endId : seg2.startId;
  if (otherId1 === otherId2) return null; // degenerate loop

  const p1 = profile.points.find((p) => p.id === otherId1);
  const p2 = profile.points.find((p) => p.id === otherId2);
  if (!p1 || !p2) return null;

  const dx1 = p1.x - point.x;
  const dz1 = p1.z - point.z;
  const len1 = Math.hypot(dx1, dz1);

  const dx2 = p2.x - point.x;
  const dz2 = p2.z - point.z;
  const len2 = Math.hypot(dx2, dz2);

  if (len1 < 0.05 || len2 < 0.05) return null;

  const v1 = { x: dx1 / len1, z: dz1 / len1 };
  const v2 = { x: dx2 / len2, z: dz2 / len2 };

  const dot = Math.max(-1, Math.min(1, v1.x * v2.x + v1.z * v2.z));
  // Degenerate collinear or overlapping
  if (dot > 0.9999 || dot < -0.9999) return null;

  const angleRad = Math.acos(dot);
  return { point, seg1, seg2, p1, p2, v1, v2, len1, len2, angleRad };
}

export function canApplySketchCornerTreatment(profile: SketchProfile, pointId: string): boolean {
  return getCornerGeometryInfo(profile, pointId) !== null;
}

export function applySketchChamfer(
  profile: SketchProfile,
  pointId: string,
  distance: number,
  createId: IdFactory,
  /** What the neighbouring corners leave of each side, when several corners are treated at once. */
  maxSetback?: number,
): CornerTreatmentResult | null {
  const info = getCornerGeometryInfo(profile, pointId);
  if (!info) return null;

  const { point, seg1, seg2, v1, v2, len1, len2 } = info;
  const maxDistance = maxSetback !== undefined ? Math.min(maxSetback, Math.min(len1, len2) * 0.999) : Math.min(len1, len2) * 0.9;
  const d = Math.max(0.1, Math.min(distance, maxDistance));

  const idA = createId("sketch-point");
  const idB = createId("sketch-point");

  const ptA: SketchPoint = {
    id: idA,
    x: point.x + d * v1.x,
    z: point.z + d * v1.z,
    mode: "corner",
  };

  const ptB: SketchPoint = {
    id: idB,
    x: point.x + d * v2.x,
    z: point.z + d * v2.z,
    mode: "corner",
  };

  const newSegmentId = createId("sketch-segment");
  const newSegment: SketchSegment = {
    id: newSegmentId,
    startId: idA,
    endId: idB,
    kind: "line",
  };

  const updatedSegments = profile.segments.map((seg) => {
    if (seg.id === seg1.id) {
      return {
        ...seg,
        startId: seg.startId === pointId ? idA : seg.startId,
        endId: seg.endId === pointId ? idA : seg.endId,
      };
    }
    if (seg.id === seg2.id) {
      return {
        ...seg,
        startId: seg.startId === pointId ? idB : seg.startId,
        endId: seg.endId === pointId ? idB : seg.endId,
      };
    }
    return seg;
  });

  const nextPoints = profile.points.filter((p) => p.id !== pointId).concat([ptA, ptB]);
  const nextSegments = [...updatedSegments, newSegment];

  return {
    profile: {
      ...profile,
      points: nextPoints,
      segments: nextSegments,
    },
    newPointIds: [idA, idB],
  };
}

export function applySketchFillet(
  profile: SketchProfile,
  pointId: string,
  radius: number,
  createId: IdFactory,
  /** What the neighbouring corners leave of each side, when several corners are treated at once. */
  maxSetback?: number,
): CornerTreatmentResult | null {
  const info = getCornerGeometryInfo(profile, pointId);
  if (!info) return null;

  const { point, seg1, seg2, v1, v2, len1, len2, angleRad } = info;
  // Tangent setback t = R / tan(alpha / 2)
  const halfAngle = angleRad / 2;
  const tanHalf = Math.tan(halfAngle);
  if (tanHalf <= 1e-4) return null;

  const requestedT = radius / tanHalf;
  const maxT = maxSetback !== undefined ? Math.min(maxSetback, Math.min(len1, len2) * 0.999) : Math.min(len1, len2) * 0.9;
  const t = Math.max(0.1, Math.min(requestedT, maxT));
  const effectiveR = t * tanHalf;

  // Bezier handle length k = (4/3) * tan(beta / 4) * R
  const beta = Math.PI - angleRad;
  const k = (4 / 3) * Math.tan(beta / 4) * effectiveR;

  const idA = createId("sketch-point");
  const idB = createId("sketch-point");

  const posA = { x: point.x + t * v1.x, z: point.z + t * v1.z };
  const posB = { x: point.x + t * v2.x, z: point.z + t * v2.z };

  // Handle at A points towards corner P (direction -v1)
  const handleA = { x: posA.x - k * v1.x, z: posA.z - k * v1.z };
  // Handle at B points towards corner P (direction -v2)
  const handleB = { x: posB.x - k * v2.x, z: posB.z - k * v2.z };

  const ptA: SketchPoint = {
    id: idA,
    x: posA.x,
    z: posA.z,
    mode: "split",
    handleOut: handleA,
  };

  const ptB: SketchPoint = {
    id: idB,
    x: posB.x,
    z: posB.z,
    mode: "split",
    handleIn: handleB,
  };

  const newSegmentId = createId("sketch-segment");
  const newSegment: SketchSegment = {
    id: newSegmentId,
    startId: idA,
    endId: idB,
    kind: "bezier",
  };

  const updatedSegments = profile.segments.map((seg) => {
    if (seg.id === seg1.id) {
      return {
        ...seg,
        startId: seg.startId === pointId ? idA : seg.startId,
        endId: seg.endId === pointId ? idA : seg.endId,
      };
    }
    if (seg.id === seg2.id) {
      return {
        ...seg,
        startId: seg.startId === pointId ? idB : seg.startId,
        endId: seg.endId === pointId ? idB : seg.endId,
      };
    }
    return seg;
  });

  const nextPoints = profile.points.filter((p) => p.id !== pointId).concat([ptA, ptB]);
  const nextSegments = [...updatedSegments, newSegment];

  return {
    profile: {
      ...profile,
      points: nextPoints,
      segments: nextSegments,
    },
    newPointIds: [idA, idB],
  };
}

export type CornersResult = {
  profile: SketchProfile;
  /** Corners rounded or chamfered. */
  applied: number;
  /** Selected points that are not a corner between two straight lines. */
  skipped: number;
};

/**
 * Several corners with the same radius or distance in one go (#269). Two selected corners that
 * share a side share it fairly: each takes at most 45 % of it, so a rectangle rounded all round comes
 * out alike at every corner instead of the first one leaving the last almost nothing. A side
 * whose other end is not selected is used as far as for a single corner.
 */
export function applySketchCorners(
  profile: SketchProfile,
  pointIds: string[],
  kind: "fillet" | "chamfer",
  size: number,
  createId: IdFactory,
): CornersResult | null {
  const ids = [...new Set(pointIds)];
  const corners = ids.filter((id) => getCornerGeometryInfo(profile, id) !== null);
  if (corners.length === 0) return null;
  const selected = new Set(corners);
  // The room of each corner is worked out on the profile as it is now: it does not change while the others are done.
  const room = new Map<string, number>();
  corners.forEach((id) => {
    const info = getCornerGeometryInfo(profile, id)!;
    const side = (otherId: string, length: number) => (selected.has(otherId) ? length * 0.45 : length * 0.9);
    room.set(id, Math.min(side(info.p1.id, info.len1), side(info.p2.id, info.len2)));
  });
  let current = profile;
  let applied = 0;
  for (const id of corners) {
    const next = kind === "fillet"
      ? applySketchFillet(current, id, size, createId, room.get(id))
      : applySketchChamfer(current, id, size, createId, room.get(id));
    if (!next) continue;
    current = next.profile;
    applied += 1;
  }
  if (applied === 0) return null;
  return { profile: current, applied, skipped: ids.length - corners.length + (corners.length - applied) };
}
