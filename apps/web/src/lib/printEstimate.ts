/**
 * Wie viel Material ein Druck braucht: Volumen, Gewicht und Filamentlaenge.
 * Massiv gerechnet ist es die Obergrenze; mit Waenden und Fuellung (die
 * Einstellungen eines Slicers kennen wir nicht) ist es eine grobe Schaetzung:
 * Oberflaeche mal Wandstaerke, dazu die Fuellung im Rest (#320).
 */

export const PRINT_MATERIALS = ["pla", "petg", "abs", "asa", "tpu", "pa"] as const;
export type PrintMaterial = (typeof PRINT_MATERIALS)[number];

/** Dichte in g/cm³, typische Herstellerangaben. */
export const PRINT_MATERIAL_DENSITY: Record<PrintMaterial, number> = {
  pla: 1.24,
  petg: 1.27,
  abs: 1.04,
  asa: 1.07,
  tpu: 1.21,
  pa: 1.14,
};

export const DEFAULT_PRINT_MATERIAL: PrintMaterial = "pla";
export const FILAMENT_DIAMETER_MM = 1.75;

export function normalizePrintMaterial(value: unknown): PrintMaterial {
  return typeof value === "string" && (PRINT_MATERIALS as readonly string[]).includes(value)
    ? value as PrintMaterial
    : DEFAULT_PRINT_MATERIAL;
}

export type PrintEstimate = {
  material: PrintMaterial;
  volumeMm3: number;
  volumeCm3: number;
  grams: number;
  filamentMeters: number;
};

export function printEstimate(volumeMm3: number, material: PrintMaterial = DEFAULT_PRINT_MATERIAL): PrintEstimate {
  const volume = Math.max(0, Number.isFinite(volumeMm3) ? volumeMm3 : 0);
  const volumeCm3 = volume / 1000;
  const radius = FILAMENT_DIAMETER_MM / 2;
  return {
    material,
    volumeMm3: volume,
    volumeCm3,
    grams: volumeCm3 * PRINT_MATERIAL_DENSITY[material],
    filamentMeters: volume / (Math.PI * radius * radius) / 1000,
  };
}

/** What a slicer is usually set to; the real settings decide, so these are the choices and a start. */
export const INFILL_CHOICES = [0, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100] as const;
export const DEFAULT_INFILL_PERCENT = 15;
export const WALL_CHOICES = [1, 2, 3, 4, 5, 6] as const;
export const DEFAULT_WALLS = 2;
/** The width of one printed line (a 0.4 mm nozzle) and the thickness of the top and bottom skin (four layers of 0.2 mm). */
export const LINE_WIDTH_MM = 0.42;
export const TOP_BOTTOM_SKIN_MM = 0.8;

export function normalizeInfillPercent(value: unknown): number {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 100 ? Math.round(number) : DEFAULT_INFILL_PERCENT;
}

export function normalizeWalls(value: unknown): number {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isInteger(number) && number >= 1 && number <= 6 ? number : DEFAULT_WALLS;
}

/** The surface of a body, split by how much each piece of it faces up or down: the top and bottom get a thicker skin than the sides. */
export type SurfaceAreas = { sideMm2: number; flatMm2: number };

export function meshSurfaceAreas(
  vertices: ReadonlyArray<readonly [number, number, number]>,
  faces: ReadonlyArray<readonly [number, number, number]>,
): SurfaceAreas {
  let side = 0;
  let flat = 0;
  for (const [a, b, c] of faces) {
    const p = vertices[a];
    const q = vertices[b];
    const r = vertices[c];
    if (!p || !q || !r) continue;
    const ux = q[0] - p[0];
    const uy = q[1] - p[1];
    const uz = q[2] - p[2];
    const vx = r[0] - p[0];
    const vy = r[1] - p[1];
    const vz = r[2] - p[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const twice = Math.hypot(nx, ny, nz);
    if (twice < 1e-12) continue;
    const area = twice / 2;
    const up = Math.abs(ny) / twice;
    flat += area * up;
    side += area * (1 - up);
  }
  return { sideMm2: side, flatMm2: flat };
}

/**
 * The volume of plastic a body needs: a skin on every surface - `walls` lines on the sides, the top and bottom skin
 * (or the walls, if they are thicker) where it faces up or down - and `infillPercent` of what the skin leaves inside.
 * A thin part is all skin and counts as solid. Rough, as it has to be without the slicer's settings.
 */
export function printedVolume(volumeMm3: number, areas: SurfaceAreas, infillPercent: number, walls: number): number {
  const volume = Math.max(0, Number.isFinite(volumeMm3) ? volumeMm3 : 0);
  const wall = normalizeWalls(walls) * LINE_WIDTH_MM;
  const skin = Math.min(volume, areas.sideMm2 * wall + areas.flatMm2 * Math.max(wall, TOP_BOTTOM_SKIN_MM));
  return skin + (normalizeInfillPercent(infillPercent) / 100) * (volume - skin);
}

export type PrintEstimateWithInfill = {
  /** As if printed solid: the upper bound. */
  solid: PrintEstimate;
  /** With the walls and the infill. */
  printed: PrintEstimate;
  infillPercent: number;
  walls: number;
};

export function printEstimateWithInfill(
  volumeMm3: number,
  areas: SurfaceAreas,
  material: PrintMaterial = DEFAULT_PRINT_MATERIAL,
  infillPercent = DEFAULT_INFILL_PERCENT,
  walls = DEFAULT_WALLS,
): PrintEstimateWithInfill {
  const infill = normalizeInfillPercent(infillPercent);
  const wallCount = normalizeWalls(walls);
  return {
    solid: printEstimate(volumeMm3, material),
    printed: printEstimate(printedVolume(volumeMm3, areas, infill, wallCount), material),
    infillPercent: infill,
    walls: wallCount,
  };
}
