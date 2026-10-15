import type { SketchPoint, SketchSegment } from "@/types/layerling";

/** Statt eines Endpunkts: die Mitte bleibt stehen, die Linie waechst zu beiden Seiten. */
export const SEGMENT_DIMENSION_CENTER = "center";

/**
 * Bringt eine gerade Skizzenlinie auf `newLength` Millimeter, in ihrer
 * Richtung. Es bleibt der Punkt `anchor` stehen (Vorgabe: der Anfangspunkt)
 * oder mit `SEGMENT_DIMENSION_CENTER` die Mitte. Was wandert, nimmt seine
 * Griffe mit; die Linien, die dort anschliessen, gehen mit dem Punkt mit.
 */
export function applySegmentDimension(
  segment: SketchSegment,
  points: SketchPoint[],
  newLength: number,
  anchor: string = segment.startId,
): SketchPoint[] {
  if (!Number.isFinite(newLength) || newLength <= 0.001) return points;
  const start = points.find((point) => point.id === segment.startId);
  const end = points.find((point) => point.id === segment.endId);
  if (!start || !end || start.id === end.id) return points;
  const currentLength = Math.hypot(end.x - start.x, end.z - start.z);
  if (currentLength < 1e-6) return points;

  const direction = { x: (end.x - start.x) / currentLength, z: (end.z - start.z) / currentLength };
  const grow = newLength - currentLength;
  // Wie weit jeder Endpunkt entlang der Linie nach aussen geht.
  const startShift = anchor === SEGMENT_DIMENSION_CENTER ? grow / 2 : anchor === end.id ? grow : 0;
  const endShift = anchor === SEGMENT_DIMENSION_CENTER ? grow / 2 : anchor === end.id ? 0 : grow;
  const moved = (point: SketchPoint, dx: number, dz: number): SketchPoint => ({
    ...point,
    x: point.x + dx,
    z: point.z + dz,
    handleIn: point.handleIn ? { x: point.handleIn.x + dx, z: point.handleIn.z + dz } : point.handleIn,
    handleOut: point.handleOut ? { x: point.handleOut.x + dx, z: point.handleOut.z + dz } : point.handleOut,
  });
  const nextStart = startShift ? moved(start, -direction.x * startShift, -direction.z * startShift) : start;
  const nextEnd = endShift ? moved(end, direction.x * endShift, direction.z * endShift) : end;
  return points.map((point) => (point.id === start.id ? nextStart : point.id === end.id ? nextEnd : point));
}
