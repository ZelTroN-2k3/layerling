/**
 * Zwei Koerper, die sich durchdringen, ergeben in einer STL zwei ineinander
 * steckende Huellen. Ein Schneider raeumt das meist still auf, CGAL und
 * OpenSCAD nicht - dort bricht die Vereinigung ab und es bleibt gar nichts
 * uebrig. Fuer die Ausfuhr muessen solche Koerper also vorher verschmolzen
 * werden.
 *
 * Dasselbe gilt fuer buendiges Aneinanderstossen: zwei Quader, die sich eine
 * Flaeche teilen, benutzen deren vier Kanten doppelt - fuer eine Pruefung auf
 * Dichtheit ist das genauso kaputt wie eine Durchdringung, und mit Rastfang ist
 * diese Lage eher die Regel als die Ausnahme. Was sich beruehrt, wird also
 * mitverschmolzen; nur wirklich getrennte Koerper bleiben getrennte Huellen.
 */

export type ExportBounds = {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

export const EXPORT_OVERLAP_TOLERANCE = 1e-6;

export function meshBounds(vertices: readonly (readonly [number, number, number])[]): ExportBounds | null {
  if (vertices.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const [x, y, z] of vertices) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) return null;
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/** Beruehren sich die beiden Kaesten oder durchdringen sie sich? */
export function boundsOverlap(a: ExportBounds, b: ExportBounds, tolerance = EXPORT_OVERLAP_TOLERANCE) {
  return (
    a.minX <= b.maxX + tolerance && b.minX <= a.maxX + tolerance &&
    a.minY <= b.maxY + tolerance && b.minY <= a.maxY + tolerance &&
    a.minZ <= b.maxZ + tolerance && b.minZ <= a.maxZ + tolerance
  );
}

/**
 * Teilt die Formen nach Farbe auf, in der Reihenfolge ihres ersten Auftretens.
 * Fuer eine 3MF darf nur Gleichfarbiges verschmolzen werden - sonst geht ein
 * eingelegtes Logo in der Platte auf und hat deren Farbe (Discussion #79).
 */
export function exportColorGroups(colors: readonly (string | undefined)[]): number[][] {
  const gruppen = new Map<string, number[]>();
  colors.forEach((color, index) => {
    const key = (color ?? "").trim().toLowerCase();
    const gruppe = gruppen.get(key);
    if (gruppe) gruppe.push(index);
    else gruppen.set(key, [index]);
  });
  return [...gruppen.values()];
}

/**
 * Gruppiert die Formen nach Ueberlappung, und zwar durchgereicht: beruehrt A
 * das B und B das C, gehoeren alle drei zusammen, auch wenn A und C weit
 * auseinander liegen. Die Reihenfolge bleibt die der Eingabe, damit die Datei
 * bei gleicher Szene gleich aussieht.
 */
export function overlappingExportClusters(
  bounds: readonly (ExportBounds | null)[],
  tolerance = EXPORT_OVERLAP_TOLERANCE,
): number[][] {
  const zugeordnet = new Array<boolean>(bounds.length).fill(false);
  const gruppen: number[][] = [];
  for (let start = 0; start < bounds.length; start += 1) {
    if (zugeordnet[start]) continue;
    zugeordnet[start] = true;
    const gruppe = [start];
    for (let gelesen = 0; gelesen < gruppe.length; gelesen += 1) {
      const aktuell = bounds[gruppe[gelesen]];
      if (!aktuell) continue;
      for (let kandidat = 0; kandidat < bounds.length; kandidat += 1) {
        const anderer = bounds[kandidat];
        if (zugeordnet[kandidat] || !anderer) continue;
        if (!boundsOverlap(aktuell, anderer, tolerance)) continue;
        zugeordnet[kandidat] = true;
        gruppe.push(kandidat);
      }
    }
    gruppe.sort((a, b) => a - b);
    gruppen.push(gruppe);
  }
  return gruppen;
}
