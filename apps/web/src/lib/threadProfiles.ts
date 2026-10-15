import type { ThreadProfile } from "@/types/layerling";

/**
 * Die Zahnformen, die ein Gewinde haben kann - an einer Stelle, damit die
 * Pruefungen beim Laden von Projekt und Arbeitsbereich und die Bruecke nicht
 * wieder jede ihre eigene Liste fuehren. Die Datei importiert nichts ausser
 * dem Typ, also koennen auch die leichten Module sie laden, ohne THREE
 * mitzuziehen.
 */
const PROFILE_SET: Record<ThreadProfile, true> = {
  v: true,
  trapezoidal: true,
  round: true,
  whitworth: true,
  custom: true,
};

export const THREAD_PROFILES = Object.keys(PROFILE_SET) as readonly ThreadProfile[];

export function isThreadProfile(value: unknown): value is ThreadProfile {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PROFILE_SET, value);
}
