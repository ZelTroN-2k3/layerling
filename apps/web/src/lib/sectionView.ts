import type { WorkplaneShape } from "@/types/layerling";
import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import { placementWorkplaneFromSurface, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";

export type SectionPlaneAxis = "x" | "y" | "z";

/** The letter the editor shows for an axis, as in the position fields: X width, Y depth, Z height. */
export type SectionAxisLetter = "X" | "Y" | "Z";

/**
 * `axis` stays three.js (y up); what the user reads uses the position fields'
 * letters (z up): x is X, z (depth) is Y, y (height) is Z.
 */
export const SECTION_AXIS_LETTER: Readonly<Record<SectionPlaneAxis, SectionAxisLetter>> = { x: "X", y: "Z", z: "Y" };

/** The axes in the order the panel shows them: X, Y, Z. */
export const SECTION_AXES_SHOWN: readonly SectionPlaneAxis[] = ["x", "z", "y"];

export function sectionAxisLetter(axis: SectionPlaneAxis): SectionAxisLetter {
  return SECTION_AXIS_LETTER[axis];
}

export function sectionAxisFromLetter(letter: SectionAxisLetter): SectionPlaneAxis {
  return letter === "X" ? "x" : letter === "Y" ? "z" : "y";
}

export type SectionPlaneSettings = {
  enabled: boolean;
  axis: SectionPlaneAxis;
  offset: number;
  flipped: boolean;
  showPlane: boolean;
};

export type SectionBounds = {
  min: number;
  max: number;
  center: number;
  step: number;
};

export const DEFAULT_SECTION_SETTINGS: SectionPlaneSettings = {
  enabled: false,
  axis: "x",
  offset: 0,
  flipped: false,
  showPlane: true,
};

/**
 * Calculates the bounding range for the cutting plane slider along the chosen axis.
 * Adds a small margin around the shapes so the user can easily slice through the entire model.
 */
export function getSectionBounds(
  shapes: WorkplaneShape[],
  axis: SectionPlaneAxis,
  workspaceWidth = 200,
  workspaceDepth = 200,
): SectionBounds {
  const visible = shapes.filter((shape) => !shape.hidden);
  if (visible.length === 0) {
    if (axis === "x") return { min: -workspaceWidth / 2, max: workspaceWidth / 2, center: 0, step: 0.5 };
    if (axis === "y") return { min: 0, max: 100, center: 50, step: 0.5 };
    return { min: -workspaceDepth / 2, max: workspaceDepth / 2, center: 0, step: 0.5 };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  visible.forEach((shape) => {
    // The box around the turned shape: a part turned or tipped reaches
    // further along some axes than its width, depth and height say.
    const half = new THREE.Vector3(shapeWidth(shape) / 2, shape.height / 2, shapeDepth(shape) / 2);
    const rotation = new THREE.Matrix4().makeRotationFromQuaternion(quaternionForShape(shape)).elements;
    const row = axis === "x" ? 0 : axis === "y" ? 1 : 2;
    // Column-major: element (row, column) sits at column * 4 + row.
    const reach = Math.abs(rotation[row]) * half.x + Math.abs(rotation[4 + row]) * half.y + Math.abs(rotation[8 + row]) * half.z;
    const center = axis === "x" ? shape.x : axis === "y" ? (shape.elevation ?? 0) + shape.height / 2 : shape.z;
    min = Math.min(min, center - reach);
    max = Math.max(max, center + reach);
  });

  const span = Math.max(max - min, 1);
  const padding = Math.max(span * 0.05, 1);
  const paddedMin = Math.round((min - padding) * 10) / 10;
  const paddedMax = Math.round((max + padding) * 10) / 10;
  const center = Math.round(((min + max) / 2) * 10) / 10;

  return {
    min: paddedMin,
    max: paddedMax,
    center,
    step: 0.5,
  };
}

/**
 * The fine slider's window: a twentieth of the coarse range to either side,
 * at least 0.5 mm and at most 10 mm, in steps 200 times finer than that.
 */
export function sectionFineWindow(bounds: Pick<SectionBounds, "min" | "max">) {
  const span = Math.min(10, Math.max(0.5, (bounds.max - bounds.min) / 20));
  return { span, step: span / 200 };
}

/**
 * The workplane on the cut (#154): on the plane of the section view, facing out of the body that
 * stays - towards the side that was cut away, as the face a cut leaves does. A sketch started there
 * draws the way one looks at that cut, so its outline in the sketch view is the cut's own. The
 * origin is where the plane crosses its axis.
 */
export function sectionPlacementWorkplane(settings: Pick<SectionPlaneSettings, "axis" | "offset" | "flipped">): PlacementWorkplane {
  const { normal } = computeSectionPlaneVector({ ...settings, enabled: true, showPlane: true });
  const origin = {
    x: settings.axis === "x" ? settings.offset : 0,
    y: settings.axis === "y" ? settings.offset : 0,
    z: settings.axis === "z" ? settings.offset : 0,
  };
  return placementWorkplaneFromSurface(origin, { x: -normal.x || 0, y: -normal.y || 0, z: -normal.z || 0 }, { x: 1, y: 0, z: 0 }, false, true);
}

/**
 * Computes normal vector and plane constant D for Ax + By + Cz + D = 0.
 * In Three.js: points with n · p + D >= 0 are kept, points with n · p + D < 0 are discarded.
 */
export function computeSectionPlaneVector(settings: SectionPlaneSettings) {
  let nx = 0;
  let ny = 0;
  let nz = 0;

  if (settings.axis === "x") {
    nx = settings.flipped ? -1 : 1;
  } else if (settings.axis === "y") {
    ny = settings.flipped ? -1 : 1;
  } else {
    nz = settings.flipped ? -1 : 1;
  }

  // If not flipped: n · p - offset >= 0 => keeps p >= offset.
  // If flipped: -n · p + offset >= 0 => keeps p <= offset.
  const constant = settings.flipped ? settings.offset : -settings.offset;

  return {
    normal: { x: nx, y: ny, z: nz },
    constant,
  };
}
