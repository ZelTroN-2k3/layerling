import type { OcctKernel, ShapeHandle } from "occt-wasm";

/**
 * Whether a kernel result holds a real solid. Past a certain size a fillet
 * returns a "valid" compound without any solid in it - and a volume that grew -
 * which looks fine until the next step tries to use it.
 */
export function cadHasSolidBody(cad: OcctKernel, shape: ShapeHandle) {
  if (cad.isSolid(shape)) return true;
  const solids = cad.getSubShapes(shape, "solid");
  const found = solids.length > 0;
  solids.forEach((solid) => {
    try {
      cad.release(solid);
    } catch {
      // The handle is already gone.
    }
  });
  return found;
}
