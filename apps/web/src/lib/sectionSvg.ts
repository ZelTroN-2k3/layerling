import { sectionAxisLetter, type SectionPlaneAxis } from "@/lib/sectionView";

/**
 * Der Schnitt als SVG: die Umrisse, die eine Ebene quer zu X, Y oder Z aus den
 * Koerpern schneidet, im Massstab 1:1 in Millimetern - fuer Laser, Plotter,
 * Schablonen und Dichtungen.
 *
 * Die Koerper kommen aus dem Export (sichtbar, ohne Loecher, Gruppen
 * verrechnet), nicht vom Bildschirm. Geschnitten wird ueber die Topologie des
 * Netzes: jeder Schnittpunkt sitzt auf einer Kante, und zwei Dreiecke, die
 * sich eine Kante teilen, teilen sich auch diesen Punkt. Aneinandergehaengt
 * wird deshalb ueber die Kante, nicht ueber Abstaende - bei einem dichten Netz
 * ergibt das immer geschlossene Umrisse, auch wo Ecken genau auf der Ebene
 * liegen.
 */

export type SectionMesh = {
  vertices: ReadonlyArray<readonly [number, number, number]>;
  faces: ReadonlyArray<readonly [number, number, number]>;
};

export type SectionPoint = { u: number; v: number };

export type SectionLoop = { points: SectionPoint[]; closed: boolean };

export type SectionBody = { name: string; color: string; loops: SectionLoop[] };

const AXIS_INDEX: Record<SectionPlaneAxis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

/** Woher man auf den Schnitt schaut - wie die Seiten des Ansichtswuerfels. */
export const SECTION_VIEW_FACE: Record<SectionPlaneAxis, "right" | "top" | "front"> = { x: "right", y: "top", z: "front" };

/**
 * Ein Punkt der Schnittebene auf dem Blatt, u nach rechts, v nach unten:
 * X-Schnitt von rechts gesehen (vorn liegt links), Y-Schnitt von oben (vorn
 * liegt unten, wie im Skizzenmodus), Z-Schnitt von vorn.
 */
export function projectSectionPoint(point: readonly [number, number, number], axis: SectionPlaneAxis): SectionPoint {
  const [x, y, z] = point;
  if (axis === "x") return { u: -z, v: -y };
  if (axis === "y") return { u: x, v: z };
  return { u: x, v: -y };
}

const WELD_GRID = 1e-5;

/** Gleiche Lagen zu einer Ecke zusammenfassen - Netze aus STL oder je Flaeche getrennten Ecken teilen sonst keine Kanten. */
function weldMesh(mesh: SectionMesh) {
  const index = new Map<string, number>();
  const positions: Array<readonly [number, number, number]> = [];
  const remap = mesh.vertices.map((vertex) => {
    const key = vertex.map((value) => Math.round(value / WELD_GRID)).join(",");
    const found = index.get(key);
    if (found !== undefined) return found;
    index.set(key, positions.length);
    positions.push(vertex);
    return positions.length - 1;
  });
  const faces = mesh.faces
    .map(([a, b, c]) => [remap[a], remap[b], remap[c]] as const)
    .filter(([a, b, c]) => a !== b && b !== c && c !== a);
  return { positions, faces };
}

function edgeKey(a: number, b: number) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

function cross(o: SectionPoint, a: SectionPoint, b: SectionPoint) {
  return (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u);
}

/** Doppelte Punkte und Punkte auf einer Geraden raus - eine Quaderwand ist dann wieder ein Strich, kein Dutzend. */
function tidyLoop(points: SectionPoint[], closed: boolean): SectionPoint[] {
  const distinct: SectionPoint[] = [];
  for (const point of points) {
    const last = distinct[distinct.length - 1];
    if (!last || Math.hypot(point.u - last.u, point.v - last.v) > 1e-7) distinct.push(point);
  }
  if (closed && distinct.length > 1) {
    const first = distinct[0];
    const last = distinct[distinct.length - 1];
    if (Math.hypot(first.u - last.u, first.v - last.v) <= 1e-7) distinct.pop();
  }
  if (distinct.length < 3) return distinct;
  let changed = true;
  let result = distinct;
  while (changed && result.length > 3) {
    changed = false;
    const next: SectionPoint[] = [];
    for (let index = 0; index < result.length; index += 1) {
      const isEnd = !closed && (index === 0 || index === result.length - 1);
      const prev = result[(index - 1 + result.length) % result.length];
      const point = result[index];
      const after = result[(index + 1) % result.length];
      const span = Math.hypot(after.u - prev.u, after.v - prev.v);
      const onLine = span > 0 && Math.abs(cross(prev, point, after)) / span < 1e-6
        && (point.u - prev.u) * (after.u - point.u) + (point.v - prev.v) * (after.v - point.v) >= 0;
      if (!isEnd && onLine) {
        changed = true;
        continue;
      }
      next.push(point);
    }
    result = next;
  }
  return result;
}

export function loopArea(points: readonly SectionPoint[]) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    area += a.u * b.v - b.u * a.v;
  }
  return area / 2;
}

/**
 * Die Umrisse eines Netzes in der Ebene `axis = offset`. Eine Ecke genau auf
 * der Ebene zaehlt zur oberen Seite; so schneidet jedes Dreieck die Ebene in
 * genau zwei Kanten oder gar nicht, und kein Umriss reisst an ihr ab.
 */
export function sliceMeshContours(mesh: SectionMesh, axis: SectionPlaneAxis, offset: number): SectionLoop[] {
  const { positions, faces } = weldMesh(mesh);
  const component = AXIS_INDEX[axis];
  const distance = positions.map((position) => position[component] - offset);
  const above = distance.map((value) => value >= 0);
  const crossing = new Map<string, readonly [number, number, number]>();
  const crossingPoint = (a: number, b: number) => {
    const key = edgeKey(a, b);
    let point = crossing.get(key);
    if (!point) {
      // Immer von derselben Ecke aus rechnen, damit beide Dreiecke der Kante
      // bitgenau denselben Punkt bekommen.
      const [from, to] = a < b ? [a, b] : [b, a];
      const t = distance[from] / (distance[from] - distance[to]);
      const p = positions[from];
      const q = positions[to];
      point = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
      crossing.set(key, point);
    }
    return key;
  };

  // Je Dreieck ein Stueck von der Kante, an der der Rand nach oben fuehrt, zu
  // der, an der er wieder nach unten geht. Bei gleichsinnig umlaufenden
  // Dreiecken laufen dann alle Stuecke eines Umrisses in dieselbe Richtung.
  const nextByStart = new Map<string, string[]>();
  const pieces: Array<{ from: string; to: string }> = [];
  for (const face of faces) {
    let up: string | null = null;
    let down: string | null = null;
    for (let corner = 0; corner < 3; corner += 1) {
      const a = face[corner];
      const b = face[(corner + 1) % 3];
      if (above[a] === above[b]) continue;
      if (above[b]) up = crossingPoint(a, b);
      else down = crossingPoint(a, b);
    }
    if (up === null || down === null) continue;
    pieces.push({ from: up, to: down });
    const list = nextByStart.get(up);
    if (list) list.push(down);
    else nextByStart.set(up, [down]);
  }

  const loops: SectionLoop[] = [];
  const used = new Set<string>();
  const pieceKey = (from: string, to: string) => `${from}>${to}`;
  const takeNext = (from: string) => {
    const options = nextByStart.get(from);
    const to = options?.find((candidate) => !used.has(pieceKey(from, candidate)));
    if (to === undefined) return null;
    used.add(pieceKey(from, to));
    return to;
  };
  for (const piece of pieces) {
    if (used.has(pieceKey(piece.from, piece.to))) continue;
    used.add(pieceKey(piece.from, piece.to));
    const keys = [piece.from, piece.to];
    let closed = false;
    for (;;) {
      const tail = keys[keys.length - 1];
      if (tail === keys[0]) {
        keys.pop();
        closed = true;
        break;
      }
      const to = takeNext(tail);
      if (to === null) break;
      keys.push(to);
    }
    const points = keys.map((key) => projectSectionPoint(crossing.get(key)!, axis));
    const tidy = tidyLoop(points, closed);
    if (closed ? tidy.length >= 3 && Math.abs(loopArea(tidy)) > 1e-6 : tidy.length >= 2) {
      loops.push({ points: tidy, closed });
    }
  }
  return loops;
}

function svgNumber(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type SectionSvgResult = {
  svg: string;
  loopCount: number;
  openCount: number;
  bodyCount: number;
  width: number;
  height: number;
};

const SHEET_MARGIN = 2;

/**
 * Das Blatt: Breite und Hoehe in mm, das viewBox in denselben Millimetern,
 * also 1:1. Jeder Koerper ist ein Pfad in seiner Farbe (Lasersoftware macht
 * aus Strichfarben Ebenen), ohne Fuellung - eine Fuellung liest LightBurn
 * und Co. sonst als Gravur. Bohrungen liegen im selben Pfad und bleiben mit
 * evenodd auch beim Fuellen in einem anderen Programm frei.
 */
export function sectionSvgDocument(bodies: readonly SectionBody[], axis: SectionPlaneAxis, offset: number, title: string): SectionSvgResult | null {
  const drawn = bodies.filter((body) => body.loops.length > 0);
  if (drawn.length === 0) return null;
  let minU = Number.POSITIVE_INFINITY;
  let maxU = Number.NEGATIVE_INFINITY;
  let minV = Number.POSITIVE_INFINITY;
  let maxV = Number.NEGATIVE_INFINITY;
  drawn.forEach((body) => body.loops.forEach((loop) => loop.points.forEach((point) => {
    minU = Math.min(minU, point.u);
    maxU = Math.max(maxU, point.u);
    minV = Math.min(minV, point.v);
    maxV = Math.max(maxV, point.v);
  })));
  const width = maxU - minU + SHEET_MARGIN * 2;
  const height = maxV - minV + SHEET_MARGIN * 2;
  const viewU = minU - SHEET_MARGIN;
  const viewV = minV - SHEET_MARGIN;
  const face = SECTION_VIEW_FACE[axis];
  const paths = drawn.map((body, index) => {
    const d = body.loops
      .map((loop) => `M${loop.points.map((point) => `${svgNumber(point.u)} ${svgNumber(point.v)}`).join(" L")}${loop.closed ? " Z" : ""}`)
      .join(" ");
    return `  <path id="body-${index + 1}" d="${d}" fill="none" fill-rule="evenodd" stroke="${xmlEscape(body.color)}" stroke-width="0.1" stroke-linejoin="round"><title>${xmlEscape(body.name)}</title></path>`;
  });
  const loopCount = drawn.reduce((sum, body) => sum + body.loops.length, 0);
  const openCount = drawn.reduce((sum, body) => sum + body.loops.filter((loop) => !loop.closed).length, 0);
  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${svgNumber(width)}mm" height="${svgNumber(height)}mm" viewBox="${svgNumber(viewU)} ${svgNumber(viewV)} ${svgNumber(width)} ${svgNumber(height)}">`,
    `  <title>${xmlEscape(title)}</title>`,
    `  <desc>layerling section at ${sectionAxisLetter(axis)} = ${svgNumber(offset)} mm, seen from the ${face}, scale 1:1 in millimetres</desc>`,
    ...paths,
    "</svg>",
    "",
  ].join("\n");
  return { svg, loopCount, openCount, bodyCount: drawn.length, width, height };
}
