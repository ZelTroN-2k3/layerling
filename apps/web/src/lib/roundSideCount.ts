import { MAX_HIGH_RESOLUTION_SIDES } from "@/lib/workplaneSettings";
import { MIN_AUTOMATIC_SIDES, ROUND_DEVIATION_TOLERANCE } from "@/lib/roundness";

// Die Zahlen stehen in roundness.ts, wo auch die Anleitung sie liest.
export { MIN_AUTOMATIC_SIDES, ROUND_DEVIATION_TOLERANCE };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Die Seitenzahl, die zu einem Durchmesser passt. Eine feste Zahl kann das
 * nicht leisten: bei zwanzig Millimetern sind sechsundneunzig Seiten laengst
 * feiner als jede Duese, bei zweihundert Millimetern misst dieselbe Facette
 * sechseinhalb Millimeter und man sieht die Kanten.
 *
 * Gerechnet wird ueber die Pfeilhoehe des Kreisabschnitts:
 * h = r mal (1 minus cos(pi durch n)), aufgeloest nach n.
 */
export function automaticSideCount(width: number, depth: number, tolerance = ROUND_DEVIATION_TOLERANCE) {
  const radius = Math.max(0.01, Math.max(width, depth) / 2);
  const cosine = clamp(1 - Math.max(1e-9, tolerance) / radius, -1, 1);
  const needed = Math.PI / Math.max(1e-9, Math.acos(cosine));
  // Vielfache von vier: so liegen die Ecken auf den Hauptachsen.
  const rounded = Math.ceil(needed / 4) * 4;
  return clamp(rounded, MIN_AUTOMATIC_SIDES, MAX_HIGH_RESOLUTION_SIDES);
}

/** Die gesetzte Seitenzahl, oder die mitwachsende, wenn keine gesetzt ist. */
export function roundSideCount(sides: number | undefined, width: number, depth: number) {
  return sides ?? automaticSideCount(width, depth);
}
