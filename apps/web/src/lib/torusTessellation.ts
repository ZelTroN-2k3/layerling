import { automaticSideCount } from "@/lib/roundSideCount";
import { MAX_HIGH_RESOLUTION_SIDES, MAX_HIGH_RESOLUTION_STEPS } from "@/lib/workplaneSettings";

/** So fein zeichnete der Torus seinen Ring und seinen Wulst, bevor beides einstellbar war (#272). */
export const TORUS_DEFAULT_RING_SIDES = 144;
export const TORUS_DEFAULT_TUBE_STEPS = 36;

const MIN_RING_SIDES = 12;
const MIN_TUBE_STEPS = 6;
/** Ring mal Wulst sind zwei Zahlen: die Pfeilhoehe darf hier groeber sein als bei einem Zylinder, sonst wird das Netz zu schwer. */
const TORUS_DEVIATION_TOLERANCE = 0.02;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Wie viele Ecken der Torus zeichnet: `sides` rund um den Ring, `steps` rund um den Wulst.
 * Ohne eigene Angabe folgt jede Zahl der Groesse, wie bei Zylinder und Kugel, und wird nie
 * grober als die alte feste Zahl - ein Torus von zweihundert Millimetern zeigt so keine Facetten.
 */
export function torusTessellation(
  shape: { sides?: number | null; steps?: number | null },
  width: number,
  depth: number,
  height: number,
) {
  const ring = Number.isFinite(shape.sides) && shape.sides != null
    ? Math.round(shape.sides)
    : Math.max(TORUS_DEFAULT_RING_SIDES, automaticSideCount(width, depth, TORUS_DEVIATION_TOLERANCE));
  const tube = Number.isFinite(shape.steps) && shape.steps != null
    ? Math.round(shape.steps)
    : Math.max(TORUS_DEFAULT_TUBE_STEPS, automaticSideCount(height, height, TORUS_DEVIATION_TOLERANCE));
  return {
    ringSides: clamp(ring, MIN_RING_SIDES, MAX_HIGH_RESOLUTION_SIDES),
    tubeSteps: clamp(tube, MIN_TUBE_STEPS, MAX_HIGH_RESOLUTION_STEPS),
  };
}
