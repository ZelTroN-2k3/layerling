import type { WorkplaneShape } from "@/types/layerling";

/**
 * A cylinder is round on purpose: one diameter, and every handle changes both sides together. For
 * the person who wants an oval after all there is the ellipse, the same body with a free length and
 * width. This is the change that turns the one into the other, so nobody has to build the shape
 * again: the patch for the cylinder, or null where it cannot be made without losing something.
 *
 * A cylinder that has been given a chamfer, a fillet or a wall (the exact body is kept with it), that
 * was turned into a mesh, imported or put together from others does not change kind.
 */
export function cylinderToEllipsePatch(shape: WorkplaneShape): Partial<WorkplaneShape> | null {
  if (shape.kind !== "cylinder") return null;
  if (shape.importedMesh || shape.groupedShapes?.length || shape.edgeTreatments?.length || shape.cadBrep || shape.cylinderWrap) return null;
  // A shape still carrying the name the palette gave it takes the ellipse's; one that was named keeps its name.
  const name = shape.name?.trim() ?? "";
  return name === "Cylinder" ? { kind: "ellipse", name: "Ellipse" } : { kind: "ellipse" };
}
