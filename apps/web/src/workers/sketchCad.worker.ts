/// <reference lib="webworker" />

import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { CAD_MODIFIER_RUNTIME_BASE, SKETCH_CAD_DEFLECTION } from "@/lib/cadModifierRuntime";
import { cadSketchRegions } from "@/lib/sketchCadProfile";
import { buildRevolvedSketchSolid } from "@/lib/cadSketchRevolve";
import { buildStrokedSketchSolid } from "@/lib/cadSketchStroke";
import { pathWire } from "@/lib/sketchCadWire";
import { buildMessage } from "@/lib/buildStamp";
import { SKETCH_STROKE_UNSUPPORTED, type SketchCadBuildRequest, type SketchCadBuildResponse } from "@/lib/sketchCadTypes";

let kernelPromise: Promise<OcctKernel> | null = null;

function kernel() {
  const moduleUrl = `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.js`;
  // Drop a rejected attempt so a transient failure (e.g. a network blip
  // fetching the 22 MB wasm) can be retried on the next call instead of
  // poisoning sketch-to-3D for the rest of the session - same fix as
  // brepKernel.ts's loadBrepWithOcct.
  kernelPromise ??= import(/* webpackIgnore: true */ moduleUrl)
    .then((imported: { default: (options?: { locateFile?: (path: string) => string }) => Promise<unknown> }) => imported.default({
      locateFile: (path) => path.endsWith(".wasm") ? `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.wasm` : path,
    }))
    .then((module) => {
      const KernelConstructor = OcctKernel as unknown as new (rawModule: unknown) => OcctKernel;
      return new KernelConstructor(module);
    })
    .catch((error) => {
      kernelPromise = null;
      throw error;
    });
  return kernelPromise;
}

function post(message: SketchCadBuildResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

// The first thing the page hears: which build this worker is from (lib/buildStamp.ts).
self.postMessage(buildMessage());

self.onmessage = async (event: MessageEvent<SketchCadBuildRequest>) => {
  const request = event.data;
  let cad: OcctKernel | null = null;
  try {
    cad = await kernel();
    cad.releaseAll();
    let result: ShapeHandle;
    if (request.revolve) {
      result = buildRevolvedSketchSolid(cad, request.profile, request.revolve.startAngle, request.revolve.sweepAngle);
    } else if (request.stroke) {
      const stroked = buildStrokedSketchSolid(cad, request.profile, request.stroke, request.height);
      if (!stroked) throw new Error(SKETCH_STROKE_UNSUPPORTED);
      result = stroked;
    } else {
      const regions = cadSketchRegions(request.profile);
      if (regions.length === 0) throw new Error("No closed profile found. Draw at least one closed loop and ensure it has no degenerate (zero-area) geometry.");
      const solids: ShapeHandle[] = regions.map((region) => {
        let face = cad!.makeFace(pathWire(cad!, region.outer));
        if (region.holes.length > 0) face = cad!.addHolesInFace(face, region.holes.map((hole) => pathWire(cad!, hole)));
        return cad!.extrude(face, 0, request.height, 0);
      });
      result = solids.length === 1 ? solids[0] : cad.makeCompound(solids);
      if (!cad.isValid(result)) throw new Error("OpenCascade produced invalid sketch topology");
    }
    const mesh = cad.tessellate(result, { linearDeflection: SKETCH_CAD_DEFLECTION.linear, angularDeflection: SKETCH_CAD_DEFLECTION.angular });
    const positions = new Float32Array(mesh.positions);
    const normals = new Float32Array(mesh.normals);
    const indices = new Uint32Array(mesh.indices);
    const brep = cad.toBREP(result);
    post({ type: "built", requestId: request.requestId, positions, normals, indices, triangleCount: mesh.triangleCount, brep }, [positions.buffer, normals.buffer, indices.buffer]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "The CAD kernel could not build this sketch");
    post({ type: "error", requestId: request.requestId, message });
    if (/memory|WebAssembly|abort/i.test(message)) kernelPromise = null;
  } finally {
    try {
      cad?.releaseAll();
    } catch {
      // The arena may already have reset after a kernel error.
    }
  }
};

export {};
