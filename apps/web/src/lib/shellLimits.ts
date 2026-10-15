import type { ShellOpenings, ShellSide } from "@/types/layerling";

export const MIN_SHELL_WALL = 0.2;

/** The order the sides are offered and stored in. */
export const SHELL_SIDES: readonly ShellSide[] = ["top", "bottom", "front", "back", "left", "right"];

/** The sides a value leaves open, whichever way it was written. */
export function shellOpenSides(openings: ShellOpenings | undefined): ShellSide[] {
  if (Array.isArray(openings)) return SHELL_SIDES.filter((side) => openings.includes(side));
  if (openings === "top" || openings === "bottom") return [openings];
  if (openings === "top-bottom") return ["top", "bottom"];
  return [];
}

/** The value to store for a set of open sides; the old names where one fits. */
export function shellOpeningsFor(sides: readonly ShellSide[]): ShellOpenings {
  const open = SHELL_SIDES.filter((side) => sides.includes(side));
  const key = open.join(",");
  if (key === "") return "none";
  if (key === "top" || key === "bottom") return key;
  if (key === "top,bottom") return "top-bottom";
  return open;
}

/**
 * The thickest wall the Hollow tool offers. Across, two walls must leave room
 * for the cavity, so half the narrower side. Up and down it depends on what
 * stays closed: a frame (open top and bottom) has no floor or lid, so the
 * height does not matter at all; one open side leaves only the floor or lid,
 * which may be almost as thick as the part is tall; closed all round, floor
 * and lid share the height. Until 1.18.5 half the height applied everywhere,
 * which refused Fratercula's 1 mm frame from a 1 mm plate.
 */
export function shellMaxThickness(size: { width: number; depth: number; height: number }, openings: ShellOpenings) {
  // The same rule along each axis: both ends open leaves no wall across it,
  // one end open leaves the other, closed at both ends they share the length.
  const sides = shellOpenSides(openings);
  const along = (length: number, a: ShellSide, b: ShellSide) => {
    const open = Number(sides.includes(a)) + Number(sides.includes(b));
    return open === 2 ? Number.POSITIVE_INFINITY : open === 1 ? length - MIN_SHELL_WALL : length / 2;
  };
  const limit = Math.min(
    along(size.height, "top", "bottom"),
    along(size.width, "left", "right"),
    along(size.depth, "front", "back"),
  );
  // A tube open at all six sides still needs a wall around something.
  return Math.max(MIN_SHELL_WALL, Number.isFinite(limit) ? limit : Math.min(size.width, size.depth, size.height) / 2);
}
