import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

export type GroupChildBounds = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

/**
 * How far a group stretches its parts. A group keeps its parts at the size
 * they were grouped at; resizing it changes only its own width, height and
 * depth. The viewport, Ungroup and the group's mesh all stretch the parts by
 * this much, so they agree on its size. A group saved without its grouped size
 * falls back to the bounds of its parts.
 */
export function groupedContentScale(group: WorkplaneShape, childBounds: GroupChildBounds): [number, number, number] {
  const baseWidth = group.groupedBaseWidth ?? childBounds.maxX - childBounds.minX;
  const baseHeight = group.groupedBaseHeight ?? childBounds.maxY - childBounds.minY;
  const baseDepth = group.groupedBaseDepth ?? childBounds.maxZ - childBounds.minZ;
  return [
    shapeWidth(group) / Math.max(0.001, baseWidth),
    group.height / Math.max(0.001, baseHeight),
    shapeDepth(group) / Math.max(0.001, baseDepth),
  ];
}

/** Stretches the parts' vertices, given in the group's own frame, to the group's size. */
export function scaleGroupedVertices<T extends readonly [number, number, number]>(vertices: readonly T[], [sx, sy, sz]: readonly [number, number, number]) {
  return vertices.map(([x, y, z]) => [x * sx, y * sy, z * sz] as [number, number, number]);
}

/**
 * How far the group's stretch lengthens each of a part's own width, height and depth. The stretch
 * runs along the group's axes; a part turned inside the group (a bar laid on its side) has its
 * width, height and depth on other axes, so each is stretched by the length its own axis gets
 * (#234). `axes` are the part's own x, y and z in the group's frame. For a part that is not
 * turned this is the group's own stretch; for a part turned by quarter turns it is exact.
 */
export function groupedPartSizeScale(
  axes: readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]],
  [sx, sy, sz]: readonly [number, number, number],
): { width: number; height: number; depth: number } {
  const along = ([x, y, z]: readonly [number, number, number]) => Math.hypot(x * sx, y * sy, z * sz);
  return { width: along(axes[0]), height: along(axes[1]), depth: along(axes[2]) };
}
