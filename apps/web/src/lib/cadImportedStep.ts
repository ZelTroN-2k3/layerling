import type { OcctKernel, ShapeHandle } from "occt-wasm";

/**
 * The solid of a STEP import's stored body, read back with the kernel. One
 * solid comes back as it is; several (a file holding more than one part) stay
 * together as they came, like a restored BREP does.
 */
export function importedStepBody(cad: OcctKernel, step: string): ShapeHandle {
  const imported = cad.importStep(step);
  const solids = cad.getSubShapes(imported, "solid");
  if (solids.length === 0) throw new Error("The stored STEP body holds no solid");
  return solids.length === 1 ? solids[0] : imported;
}
