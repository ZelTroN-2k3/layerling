/**
 * Ueberhaenge: Flaechen, die steiler nach unten zeigen, als ein Drucker ohne
 * Stuetzen schafft. Der Winkel zaehlt von der Senkrechten - eine Wand hat 0°,
 * eine waagerechte Decke 90°. Ueblich sind 45°.
 */
export const DEFAULT_OVERHANG_ANGLE = 45;
export const MIN_OVERHANG_ANGLE = 30;
export const MAX_OVERHANG_ANGLE = 70;
/** What lies this close above the plate rests on it and needs no support. */
export const OVERHANG_PLATE_TOLERANCE = 0.05;

export function normalizeOverhangAngle(value: unknown, fallback = DEFAULT_OVERHANG_ANGLE) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(MAX_OVERHANG_ANGLE, Math.max(MIN_OVERHANG_ANGLE, Math.round(number)));
}

/**
 * A face exactly at the angle is no overhang: a 45 degree chamfer lies right on the limit, and the
 * float noise of its mesh decided whether it was marked (#269). So the limit is a hair above:
 * 0.005 of the downward share is about 0.4 degrees at 45.
 */
export const OVERHANG_ANGLE_TOLERANCE = 0.005;

/** -normal.y above this marks an overhang; the shader uses the same number. */
export function overhangDownwardLimit(angle: number) {
  return Math.sin((normalizeOverhangAngle(angle) * Math.PI) / 180) + OVERHANG_ANGLE_TOLERANCE;
}
