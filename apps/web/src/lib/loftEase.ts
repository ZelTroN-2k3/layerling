/**
 * How far along from the bottom outline to the top outline a section at height share `t` lies,
 * for a smooth transition (#271). `smooth` 0 is the straight transition: the share is the height
 * share itself. 1 is an S-curve: the sides leave both ends straight up and change their size in
 * between, the shape of a hose adapter that flares from a narrow to a wide pipe. Both the display
 * mesh and the exact body place their sections with this one function, so they cannot differ.
 */
export function loftEaseShare(t: number, smooth: number) {
  const share = Math.min(1, Math.max(0, Number.isFinite(smooth) ? smooth : 0));
  if (share <= 0) return t;
  const eased = t * t * (3 - 2 * t);
  return t + share * (eased - t);
}

/** Sections a smooth loft is built through, ends included: close enough that the kernel's spline stays on the S-curve. */
export const LOFT_SMOOTH_SECTIONS = 13;
