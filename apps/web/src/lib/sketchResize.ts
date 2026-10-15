import type { SketchProfile, WorkplaneShape } from "@/types/layerling";

/*
 * A body extruded from a sketch carries its exact CAD body as it was built.
 * Resized afterwards, only its mesh followed; the stored body was stretched on
 * demand, and stretching curved sides unevenly gives the kernel an invalid
 * solid ("The stored CAD feature could not be restored", #115). So a resized
 * sketch body is built again from its sketch, stretched to the new size -
 * lines and Bézier curves stay exactly what they were when stretched - and the
 * sketch keeps the size the body has, for the next time it is edited.
 */

/** How much the body was stretched since its exact body was built, or null when it was not. */
export function sketchBodyStretch(shape: WorkplaneShape) {
  if (!shape.sketchProfile || shape.sketchOperation === "revolve" || !shape.cadBrep || !shape.cadBrepFrame) return null;
  if (shape.groupedShapes?.length || shape.edgeTreatments?.length || shape.locked) return null;
  const frame = shape.cadBrepFrame;
  const width = shape.width;
  const depth = shape.depth;
  const changed = Math.abs(width - frame.width) > 0.005 || Math.abs(depth - frame.depth) > 0.005 || Math.abs(shape.height - frame.height) > 0.005;
  if (!changed) return null;
  return {
    x: width / Math.max(0.001, frame.width),
    z: depth / Math.max(0.001, frame.depth),
    height: shape.height,
  };
}

/** The sketch stretched about the middle of its points by `x` across and `z` along. */
export function stretchedSketchProfile(profile: SketchProfile, x: number, z: number): SketchProfile {
  const xs = profile.points.map((point) => point.x);
  const zs = profile.points.map((point) => point.z);
  const centerX = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  const centerZ = zs.length ? (Math.min(...zs) + Math.max(...zs)) / 2 : 0;
  const map = (point: { x: number; z: number }) => ({ x: centerX + (point.x - centerX) * x, z: centerZ + (point.z - centerZ) * z });
  return {
    points: profile.points.map((point) => ({
      ...point,
      ...map(point),
      handleIn: point.handleIn ? map(point.handleIn) : undefined,
      handleOut: point.handleOut ? map(point.handleOut) : undefined,
    })),
    segments: profile.segments.map((segment) => ({ ...segment })),
    images: (profile.images ?? []).map((image) => ({ ...image })),
    // The stroke keeps its width: a stretched frame keeps its wall.
    ...(profile.stroke ? { stroke: { ...profile.stroke } } : {}),
    ...(profile.silhouette ? { silhouette: true } : {}),
  };
}
