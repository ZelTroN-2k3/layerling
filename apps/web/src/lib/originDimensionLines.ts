import {
  dimensionLabelPosition,
  dimensionLineStart,
  formatMoveDimension,
  type MoveDimensionScreenPoint,
} from "@/lib/moveDimensionLines";

export type OriginDimensionAxis = "x" | "z";

export type OriginDimensionLine = {
  axis: OriginDimensionAxis;
  value: number;
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
};

export type OriginDimensionOverlayData = {
  width: number;
  height: number;
  lines: OriginDimensionLine[];
};

type OriginDimensionWorldPoint = {
  x: number;
  y: number;
  z: number;
};

/**
 * Abstand einer Form vom Werkflaechen-Ursprung entlang einer Achse - null,
 * wenn die Form diese Achse graetscht (ein Teil im Plus, ein Teil im Minus),
 * weil es dafuer keinen einzelnen sinnvollen Abstand gibt.
 */
export function computeOriginAxisDistance(centerLocal: number, halfExtentLocal: number, eps: number): number | null {
  const lo = centerLocal - halfExtentLocal;
  const hi = centerLocal + halfExtentLocal;
  if (lo >= -eps) return lo;
  if (hi <= eps) return hi;
  return null;
}

type CreateOriginDimensionOverlayOptions = {
  originWorld: OriginDimensionWorldPoint;
  /** Weltpunkt am Ende der X-Bemassung (Ursprung + Werkflaechen-xAxis * distanceX) - null, wenn diese Achse graetscht. */
  xEndpointWorld: OriginDimensionWorldPoint | null;
  /** Weltpunkt am Ende der Z-Bemassung (Ursprung + Werkflaechen-zAxis * distanceZ) - null, wenn diese Achse graetscht. */
  zEndpointWorld: OriginDimensionWorldPoint | null;
  distanceX: number | null;
  distanceZ: number | null;
  accuracy: number;
  width: number;
  height: number;
  project: (point: OriginDimensionWorldPoint) => MoveDimensionScreenPoint;
};

/** Bildschirm-Layout fuer die Abstandslinien zum Ursprung - dieselbe Ausweichlogik wie beim Verschieben-Massband, nur ohne dessen Nahe-Null-Unterdrueckung und fuer beliebig orientierte Werkflaechen-Achsen statt fester Weltachsen. */
export function createOriginDimensionOverlay({
  originWorld,
  xEndpointWorld,
  zEndpointWorld,
  distanceX,
  distanceZ,
  accuracy,
  width,
  height,
  project,
}: CreateOriginDimensionOverlayOptions): OriginDimensionOverlayData | null {
  const safeScreenPoint = (point: MoveDimensionScreenPoint) => ({
    x: Number.isFinite(point.x) ? point.x : width / 2,
    y: Number.isFinite(point.y) ? point.y : height / 2,
  });
  const origin = safeScreenPoint(project(originWorld));
  const xEndpoint = xEndpointWorld ? safeScreenPoint(project(xEndpointWorld)) : null;
  const zEndpoint = zEndpointWorld ? safeScreenPoint(project(zEndpointWorld)) : null;
  const lines: OriginDimensionLine[] = [];

  if (xEndpoint && distanceX !== null) {
    const label = dimensionLabelPosition(origin, xEndpoint, zEndpoint ?? xEndpoint, zEndpoint !== null, width, height);
    const start = dimensionLineStart(origin, xEndpoint);
    lines.push({
      axis: "x",
      value: distanceX,
      label: formatMoveDimension(distanceX, accuracy),
      x1: start.x,
      y1: start.y,
      x2: xEndpoint.x,
      y2: xEndpoint.y,
      labelX: label.x,
      labelY: label.y,
    });
  }

  if (zEndpoint && distanceZ !== null) {
    const label = dimensionLabelPosition(origin, zEndpoint, xEndpoint ?? zEndpoint, xEndpoint !== null, width, height);
    const start = dimensionLineStart(origin, zEndpoint);
    lines.push({
      axis: "z",
      // Read as Y, which counts towards the back (#182); inside, z runs towards the viewer.
      value: -distanceZ || 0,
      label: formatMoveDimension(-distanceZ || 0, accuracy),
      x1: start.x,
      y1: start.y,
      x2: zEndpoint.x,
      y2: zEndpoint.y,
      labelX: label.x,
      labelY: label.y,
    });
  }

  return lines.length > 0 ? { width, height, lines } : null;
}
