import type { WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";

const MIN_VISIBLE_GRID_STEP = 1;
const MAX_VISIBLE_GRID_STEP = 200;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cleanCoordinate(value: number) {
  const rounded = Number(value.toFixed(6));
  return Math.abs(rounded) < 1e-6 ? 0 : rounded;
}

export function visibleGridStep(workspace: WorkplaneWorkspaceSettings) {
  return clamp(workspace.gridBlockSize, MIN_VISIBLE_GRID_STEP, MAX_VISIBLE_GRID_STEP);
}

export type GridFootprintBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

function nearestVisibleGridLine(value: number, step: number) {
  // The grid counts from the origin, like the move snapping.
  return Math.round(value / step) * step;
}

export function snapShapeFootprintToVisibleGrid(
  shape: WorkplaneShape,
  bounds: GridFootprintBounds,
  workspace: WorkplaneWorkspaceSettings,
) {
  const step = visibleGridStep(workspace);
  const xOffsets = [bounds.minX, bounds.maxX].map((value) => nearestVisibleGridLine(value, step) - value);
  const zOffsets = [bounds.minZ, bounds.maxZ].map((value) => nearestVisibleGridLine(value, step) - value);
  const deltaX = xOffsets.reduce((best, value) => Math.abs(value) < Math.abs(best) ? value : best);
  const deltaZ = zOffsets.reduce((best, value) => Math.abs(value) < Math.abs(best) ? value : best);
  return {
    ...shape,
    x: cleanCoordinate(shape.x + deltaX),
    z: cleanCoordinate(shape.z + deltaZ),
  };
}
