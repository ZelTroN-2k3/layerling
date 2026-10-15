/// <reference lib="webworker" />

import { cadHasSolidBody } from "@/lib/cadSolidBody";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { orientedFaceNormal, shellSolid } from "@/lib/cadShell";
import type { CadModifierComponentMesh, CadModifierDeflection, CadModifierDisplayEdge, CadModifierEdge, CadModifierMeshPart, CadModifierPrimitivePart, CadModifierProfilePart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { importedStepBody } from "@/lib/cadImportedStep";
import { threadPartSolid } from "@/lib/threadSolid";
import { springPartSolid } from "@/lib/springSolid";
import { helicalGearPartSolid } from "@/lib/gearSolid";
import { meshTreatedBody } from "@/lib/cadMeshAccuracy";
import { planarMeshFaces } from "@/lib/cadPlanarMesh";
import { buildMessage } from "@/lib/buildStamp";
import { CAD_MODIFIER_KERNEL_RESTART_MESSAGE, CAD_MODIFIER_RUNTIME_BASE, cadModifierCappedDeflection, cadModifierTessellationDeflection, cadModifierTopologyEdgeIsSelectable, cadTransformRequiresGeneralTransform, isCadModifierKernelExhausted, isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";

const HASH_UPPER_BOUND = 2_147_483_647;
const CAD_EDGE_WIREFRAME_DEFLECTION = 0.035;
const CAD_DISPLAY_EDGE_MIN_ANGLE = 0.75;
const CURVED_SURFACE_TYPES = new Set(["cylinder", "cone", "sphere", "torus", "bspline", "bezier", "offset", "revolution", "extrusion"]);
let kernelPromise: Promise<OcctKernel> | null = null;
let baseShape: ShapeHandle | null = null;
let baseSolids: ShapeHandle[] = [];
let edgeHandles: ShapeHandle[] = [];
let edgeOwners: number[] = [];

type CollectedCadEdgeGeometry = Omit<CadModifierEdge, "display" | "selectable"> & {
  curveType: string;
  surfaceTypes: string[];
  faceAreas: number[];
};
type CollectedCadEdge = CollectedCadEdgeGeometry & Pick<CadModifierEdge, "display" | "selectable">;

// The first thing the page hears: which build this worker is from (lib/buildStamp.ts).
self.postMessage(buildMessage());

function post(message: CadModifierWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

function kernel() {
  const moduleUrl = `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.js`;
  // Drop a rejected attempt so a transient failure (e.g. a network blip
  // fetching the 22 MB wasm) can be retried on the next call instead of
  // poisoning edge treatment for the rest of the session - same fix as
  // brepKernel.ts's loadBrepWithOcct.
  kernelPromise ??= import(/* webpackIgnore: true */ moduleUrl).then((imported: { default: (options?: { locateFile?: (path: string) => string }) => Promise<unknown> }) => imported.default({
    locateFile: (path) => path.endsWith(".wasm") ? `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.wasm` : path,
  })).then((module) => {
    const KernelConstructor = OcctKernel as unknown as new (rawModule: unknown) => OcctKernel;
    return new KernelConstructor(module);
  }).catch((error) => {
    kernelPromise = null;
    throw error;
  });
  return kernelPromise;
}

function releaseSession(cad: OcctKernel) {
  try {
    cad.releaseAll();
  } catch {
    // The arena may already be empty after an operation failure.
  }
  baseShape = null;
  baseSolids = [];
  edgeHandles = [];
  edgeOwners = [];
}

function cadShapeIsValid(cad: OcctKernel, shape: ShapeHandle) {
  const validator = (cad as { isValid?: unknown }).isValid;
  if (typeof validator !== "function") throw new Error("isValid is not a function");
  try {
    return Boolean(validator.call(cad, shape));
  } catch {
    return false;
  }
}


/**
 * The BREP a treated body is stored as, without the mesh the display was cut from: on a body whose
 * faces the mesh stands off, the kernel's validity check counts the mesh too, and the stored body
 * then restores as "not valid" for the next treatment (a widened text's rim, #215). A copy of the
 * shape leaves the mesh behind; the stored text is also half the size.
 */
function storedBrep(cad: OcctKernel, shape: ShapeHandle) {
  const bare = cad.copy(shape);
  try {
    return cad.toBREP(bare);
  } finally {
    cad.release(bare);
  }
}

function parseEdgeFaceMap(values: number[]) {
  const map = new Map<number, number[]>();
  for (let index = 0; index + 1 < values.length; ) {
    const edgeHash = values[index++];
    const count = values[index++];
    const faces = values.slice(index, index + count);
    index += count;
    const current = map.get(edgeHash) ?? [];
    faces.forEach((hash) => {
      if (!current.includes(hash)) current.push(hash);
    });
    map.set(edgeHash, current);
  }
  return map;
}

function edgeAngle(cad: OcctKernel, points: number[], faceHashes: number[], faceByHash: Map<number, ShapeHandle>) {
  if (faceHashes.length !== 2 || points.length < 6) return { angle: 0, boundary: faceHashes.length < 2, manifold: false };
  const offset = Math.max(0, Math.floor(points.length / 6) * 3);
  const point = { x: points[offset], y: points[offset + 1], z: points[offset + 2] };
  const faceA = faceByHash.get(faceHashes[0]);
  const faceB = faceByHash.get(faceHashes[1]);
  if (faceA === undefined || faceB === undefined) return { angle: 0, boundary: false, manifold: false };
  try {
    const a = orientedFaceNormal(cad, faceA, point);
    const b = orientedFaceNormal(cad, faceB, point);
    const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
    // Both normals point out of the solid, so this is the turn across the edge:
    // 0 on a smooth seam, 90 on a box corner, near 180 on a knife edge.
    const angle = (Math.acos(dot) * 180) / Math.PI;
    return { angle, boundary: false, manifold: true };
  } catch {
    return { angle: 0, boundary: false, manifold: false };
  }
}

function meshPartToAsciiStl(part: CadModifierMeshPart) {
  if (!part.positions || !part.indices) throw new Error("The selected object has no mesh data");
  const lines = new Array<string>(part.indices.length / 3 + 2);
  lines[0] = "solid layerling";
  const { positions, indices } = part;
  for (let offset = 0, face = 1; offset + 2 < indices.length; offset += 3, face += 1) {
    const ai = indices[offset] * 3;
    const bi = indices[offset + 1] * 3;
    const ci = indices[offset + 2] * 3;
    const ax = positions[ai];
    const ay = positions[ai + 1];
    const az = positions[ai + 2];
    const bx = positions[bi];
    const by = positions[bi + 1];
    const bz = positions[bi + 2];
    const cx = positions[ci];
    const cy = positions[ci + 1];
    const cz = positions[ci + 2];
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    lines[face] = `facet normal ${nx} ${ny} ${nz}\n outer loop\n  vertex ${ax} ${ay} ${az}\n  vertex ${bx} ${by} ${bz}\n  vertex ${cx} ${cy} ${cz}\n endloop\nendfacet`;
  }
  lines[lines.length - 1] = "endsolid layerling";
  return lines.join("\n");
}

function isCadTransform(transform: number[] | undefined): transform is number[] {
  return Boolean(transform?.length === 12 && transform.every(Number.isFinite));
}

function isIdentityCadTransform(transform: number[]) {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  return transform.every((value, index) => Math.abs(value - identity[index]) < 1e-9);
}

function applyCadTransform(cad: OcctKernel, shape: ShapeHandle, transform: number[] | undefined) {
  if (!isCadTransform(transform) || isIdentityCadTransform(transform)) return shape;
  if (cadTransformRequiresGeneralTransform(transform)) {
    return cad.generalTransform(shape, transform);
  }
  try {
    return cad.transform(shape, transform);
  } catch {
    return cad.generalTransform(shape, transform);
  }
}

const ROTATE_Z_TO_Y: number[] = [
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, -1, 0, 0,
];

function reconstructPrimitiveSolid(cad: OcctKernel, primitive: CadModifierPrimitivePart) {
  let solid: ShapeHandle;
  if (primitive.kind === "box") {
    const width = primitive.width;
    const depth = primitive.depth;
    const height = primitive.height;
    if (![width, depth, height].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error("The selected primitive has invalid dimensions");
    }
    solid = cad.makeBoxFromCorners(
      { x: -width / 2, y: 0, z: -depth / 2 },
      { x: width / 2, y: height, z: depth / 2 },
    );
  } else if (primitive.kind === "cylinder") {
    const radius = primitive.radius;
    const height = primitive.height;
    if (![radius, height].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error("The selected primitive has invalid dimensions");
    }
    const raw = cad.makeCylinder(radius, height);
    solid = cad.transform(raw, ROTATE_Z_TO_Y);
    cad.release(raw);
  } else if (primitive.kind === "cone") {
    const baseRadius = primitive.baseRadius;
    const topRadius = primitive.topRadius;
    const height = primitive.height;
    if (![baseRadius, topRadius, height].every(Number.isFinite) || baseRadius <= 0 || topRadius < 0 || height <= 0) {
      throw new Error("The selected primitive has invalid dimensions");
    }
    const raw = cad.makeCone(baseRadius, topRadius, height);
    solid = cad.transform(raw, ROTATE_Z_TO_Y);
    cad.release(raw);
  } else if (primitive.kind === "sphere") {
    const radius = primitive.radius;
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new Error("The selected primitive has invalid dimensions");
    }
    solid = cad.makeSphere(radius);
  } else if (primitive.kind === "torus") {
    const majorRadius = primitive.majorRadius;
    const minorRadius = primitive.minorRadius;
    if (![majorRadius, minorRadius].every(Number.isFinite) || majorRadius <= 0 || minorRadius <= 0) {
      throw new Error("The selected primitive has invalid dimensions");
    }
    const raw = cad.makeTorus(majorRadius, minorRadius);
    solid = cad.transform(raw, ROTATE_Z_TO_Y);
    cad.release(raw);
  } else {
    throw new Error(`Unsupported CAD primitive: ${(primitive as { kind: string }).kind}`);
  }

  const transformed = applyCadTransform(cad, solid, primitive.transform);
  if (!cad.isSolid(transformed) || !cadShapeIsValid(cad, transformed)) {
    throw new Error("The selected primitive could not be prepared as a valid CAD solid");
  }
  return transformed;
}

/**
 * Only a memory fault leaves the kernel unfit for another attempt. Everything
 * else the exact path can throw - an OCCT error, even a raw
 * WebAssembly.Exception - still leaves the mesh path to try; if that runs out
 * of room too, the handler below restarts the kernel exactly as before.
 */
function isFatalKernelFault(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  return isCadModifierWasmMemoryFault(message, name);
}

/** Exact profile and STEP bodies the current prepare attempt has actually used. */
let exactProfileBodiesUsed = 0;

function reconstructProfileSolid(cad: OcctKernel, profile: CadModifierProfilePart) {
  const local = profileExtrusionSolid(cad, profile);
  let placed = applyCadTransform(cad, local, profile.transform);
  if (profile.grow && (!cad.isSolid(placed) || !cadShapeIsValid(cad, placed))) {
    // A widened text's walls are moved outlines: standing somewhere other than the origin can tip
    // the kernel's validity check, and its own repair closes that - kept where the volume stays.
    const volume = cad.getVolume(placed);
    const repaired = cad.fixShape(placed);
    const solids = cad.isSolid(repaired) ? [repaired] : cad.getSubShapes(repaired, "solid");
    if (solids.length === 1 && cadShapeIsValid(cad, solids[0]) && Math.abs(cad.getVolume(solids[0]) - volume) <= 1e-4 * Math.abs(volume)) placed = solids[0];
  }
  if (!cad.isSolid(placed) || !cadShapeIsValid(cad, placed)) throw new Error("The exact profile body is not a valid solid after placing it");
  const mismatch = cadProfileSolidMismatch(cad, placed, profile.expected);
  if (mismatch) throw new Error(`The exact profile body does not match the shape (${mismatch})`);
  return placed;
}

/** A stored exact body placed by its transform, healed if it has to be; throws unless it is a valid solid. */
function restoredExactSolid(cad: OcctKernel, stored: ShapeHandle, transform: number[] | undefined) {
  // Eine Verschiebung oder Drehung ist eine starre Bewegung; die gehoert in
  // transform. generalTransform baut analytische Flaechen in Splines um - das
  // ist teuer, ungenauer, und der Kernel nimmt es uebel.
  let exact = applyCadTransform(cad, stored, transform);
  const restoredSolids = cad.getSubShapes(exact, "solid");
  if (cadShapeIsValid(cad, exact) && (cad.isSolid(exact) || restoredSolids.length > 0)) {
    return restoredSolids.length === 1 ? restoredSolids[0] : exact;
  }
  exact = cad.fixShape(exact);
  exact = cad.fixFaceOrientations(exact);
  if (cad.isSolid(exact)) exact = cad.healSolid(exact, 1e-5);
  const healedSolids = cad.getSubShapes(exact, "solid");
  if (cadShapeIsValid(cad, exact) && (cad.isSolid(exact) || healedSolids.length > 0)) {
    return healedSolids.length === 1 ? healedSolids[0] : exact;
  }
  throw new Error("The stored CAD feature could not be restored as a valid solid");
}

function reconstructSolid(cad: OcctKernel, part: CadModifierMeshPart) {
  if (part.primitive) {
    return reconstructPrimitiveSolid(cad, part.primitive);
  }
  if (part.profile) {
    try {
      const solid = reconstructProfileSolid(cad, part.profile);
      exactProfileBodiesUsed += 1;
      return solid;
    } catch (error) {
      // Without its mesh (too dense to send) there is nothing to fall back on;
      // with it, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This shape could not be rebuilt as an exact CAD body, and its mesh is too dense for edge treatment. ${reason}`.trim());
      }
    }
  }
  if (part.thread) {
    try {
      const placed = applyCadTransform(cad, threadPartSolid(cad, part.thread), part.thread.transform);
      if (!cadShapeIsValid(cad, placed)) throw new Error("The exact thread body is not valid after placing it");
      const mismatch = cadProfileSolidMismatch(cad, placed, part.thread.expected);
      if (mismatch) throw new Error(`The exact thread body does not match the shape (${mismatch})`);
      exactProfileBodiesUsed += 1;
      return placed;
    } catch (error) {
      // As for a profile: with its mesh along, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This thread could not be built as an exact body, and its mesh is too dense for edge treatment. ${reason}`.trim());
      }
    }
  }
  if (part.spring) {
    try {
      const placed = applyCadTransform(cad, springPartSolid(cad, part.spring), part.spring.transform);
      if (!cadShapeIsValid(cad, placed)) throw new Error("The exact spring body is not valid after placing it");
      const mismatch = cadProfileSolidMismatch(cad, placed, part.spring.expected);
      if (mismatch) throw new Error(`The exact spring body does not match the shape (${mismatch})`);
      exactProfileBodiesUsed += 1;
      return placed;
    } catch (error) {
      // As for a profile: with its mesh along, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This spring could not be built as an exact body, and its mesh is too dense for edge treatment. ${reason}`.trim());
      }
    }
  }
  if (part.helicalGear) {
    try {
      const placed = applyCadTransform(cad, helicalGearPartSolid(cad, part.helicalGear), part.helicalGear.transform);
      if (!cadShapeIsValid(cad, placed)) throw new Error("The exact gear body is not valid after placing it");
      const mismatch = cadProfileSolidMismatch(cad, placed, part.helicalGear.expected);
      if (mismatch) throw new Error(`The exact gear body does not match the shape (${mismatch})`);
      exactProfileBodiesUsed += 1;
      return placed;
    } catch (error) {
      // As for a profile: with its mesh along, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This gear could not be built as an exact body, and its mesh is too dense for edge treatment. ${reason}`.trim());
      }
    }
  }
  if (part.step) {
    try {
      const restored = restoredExactSolid(cad, importedStepBody(cad, part.step), part.brepTransform);
      const mismatch = cadProfileSolidMismatch(cad, restored, part.expected);
      if (mismatch) throw new Error(`The imported STEP body does not match the shape (${mismatch})`);
      exactProfileBodiesUsed += 1;
      return restored;
    } catch (error) {
      // As for a profile: with its mesh along, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This imported STEP body could not be restored for edge treatment, and its mesh is too dense to use instead. ${reason}`.trim());
      }
    }
  }
  if (part.brep) {
    return restoredExactSolid(cad, cad.fromBREP(part.brep), part.brepTransform);
  }
  return reconstructMeshSolid(cad, part);
}

/** Meshes of more triangles than this are curved bodies: no use looking for flat faces in them. */
const PLANAR_FACE_TRIANGLE_LIMIT = 6000;

/**
 * The solid of a mesh part. Triangles of one flat face are flat only to float32 accuracy, so the
 * kernel can leave such a face in pieces, and a fillet or chamfer next to the seams fails (#248).
 * When the plain way gives more faces than the mesh has flat ones, the flat faces are built whole
 * and sewn instead; whatever goes wrong there leaves the plain result.
 */
function reconstructMeshSolid(cad: OcctKernel, part: CadModifierMeshPart) {
  let plain: ShapeHandle | null = null;
  let plainError: unknown = null;
  try {
    plain = plainMeshSolid(cad, part);
  } catch (error) {
    if (isFatalKernelFault(error)) throw error;
    plainError = error;
  }
  if (part.positions && part.indices && part.indices.length / 3 <= PLANAR_FACE_TRIANGLE_LIMIT) {
    try {
      const flat = planarMeshFaces(cad, part.positions, part.indices);
      if (flat && (plain === null || cad.getSubShapes(plain, "face").length > flat.faceCount)) {
        for (const tolerance of [1e-6, 1e-5, 1e-4]) {
          let candidate = cad.sewAndSolidify(flat.faces, tolerance);
          candidate = cad.fixShape(candidate);
          if (cad.isSolid(candidate)) candidate = cad.healSolid(candidate, tolerance);
          candidate = cad.fixFaceOrientations(candidate);
          candidate = cad.removeDegenerateEdges(candidate);
          candidate = cad.unifySameDomain(candidate);
          if (cad.isSolid(candidate) && cadShapeIsValid(cad, candidate) && (plain === null || cad.getSubShapes(candidate, "face").length < cad.getSubShapes(plain, "face").length)) {
            return candidate;
          }
        }
      }
    } catch (error) {
      if (isFatalKernelFault(error)) throw error;
      // The plain solid stays.
    }
  }
  if (plain !== null) return plain;
  throw plainError;
}

function plainMeshSolid(cad: OcctKernel, part: CadModifierMeshPart) {
  const imported = cad.importStl(meshPartToAsciiStl(part));
  let shape = cad.fixShape(imported);
  if (cad.isSolid(shape)) {
    try {
      shape = cad.healSolid(shape, 1e-4);
      shape = cad.fixFaceOrientations(shape);
      shape = cad.removeDegenerateEdges(shape);
      shape = cad.unifySameDomain(shape);
    } catch {
      // Fall through to face sewing when the imported solid cannot be healed directly.
    }
    if (cad.isSolid(shape) && cadShapeIsValid(cad, shape)) return shape;
  }

  const faces = cad.getSubShapes(imported, "face");
  if (faces.length === 0) throw new Error("The selected object has no closed faces");
  for (const tolerance of [1e-5, 1e-4, 1e-3, 1e-2]) {
    try {
      let candidate = cad.sewAndSolidify(faces, tolerance);
      candidate = cad.fixShape(candidate);
      if (cad.isSolid(candidate)) candidate = cad.healSolid(candidate, tolerance);
      candidate = cad.fixFaceOrientations(candidate);
      candidate = cad.removeDegenerateEdges(candidate);
      candidate = cad.unifySameDomain(candidate);
      if (cad.isSolid(candidate) && cadShapeIsValid(cad, candidate)) return candidate;
    } catch {
      // Try the next tolerance. Curved tessellations can need looser vertex sewing.
    }
  }
  throw new Error("The selected mesh is open or non-manifold. Repair it before adding edge treatments.");
}

function reconstructParts(cad: OcctKernel, parts: CadModifierMeshPart[]) {
  const solids = parts.filter((part) => !part.hole).map((part) => reconstructSolid(cad, part));
  const holes = parts.filter((part) => part.hole).map((part) => reconstructSolid(cad, part));
  if (solids.length === 0) throw new Error("The group has no solid body to modify");
  let result = solids[0];
  for (let index = 1; index < solids.length; index += 1) {
    result = cad.fuse(result, solids[index]);
    result = cad.simplify(result);
    result = cad.unifySameDomain(result);
  }
  for (const hole of holes) {
    result = cad.cut(result, hole);
    result = cad.simplify(result);
    result = cad.unifySameDomain(result);
  }
  const combined = result;
  // The repair runs on a copy: ShapeFix also rewrites the sub-shapes it
  // shares with its input, so a body it breaks would be broken for the
  // fallback below as well.
  result = cad.fixShape(cad.copy(combined));
  result = cad.simplify(result);
  result = cad.unifySameDomain(result);
  if (!cadShapeIsValid(cad, result) && cadShapeIsValid(cad, combined)) {
    // The repair can break a body that was valid to begin with: a filleted
    // text (several glyph solids with curved fillets) comes back from its
    // stored BREP valid, and fixShape turns it invalid, so a second edge
    // treatment on it failed. Keep the body as it was.
    try {
      const untouched = cad.unifySameDomain(cad.simplify(combined));
      result = cadShapeIsValid(cad, untouched) ? untouched : combined;
    } catch {
      result = combined;
    }
  }
  if (!cadShapeIsValid(cad, result)) throw new Error("The grouped solid could not be repaired into valid topology");
  return result;
}

/**
 * Exact profile bodies (and STEP imports' own bodies) first; if the group
 * cannot be combined from them, the whole group again from the display meshes - the way it was built before
 * exact profiles existed - as long as an exact body was in play and every
 * profile part brought its mesh. Called right after releaseSession, so the
 * failed attempt's handles are all that is in the arena and can go.
 */
function reconstructPartsWithFallback(cad: OcctKernel, parts: CadModifierMeshPart[]) {
  exactProfileBodiesUsed = 0;
  try {
    return reconstructParts(cad, parts);
  } catch (error) {
    const exactParts = parts.filter((part) => part.profile || part.step || part.thread || part.spring || part.helicalGear);
    if (
      isFatalKernelFault(error) ||
      exactProfileBodiesUsed === 0 ||
      exactParts.some((part) => !part.positions || !part.indices)
    ) throw error;
    releaseSession(cad);
    return reconstructParts(cad, parts.map((part) => (part.profile || part.step || part.thread || part.spring || part.helicalGear ? { ...part, profile: undefined, step: undefined, thread: undefined, spring: undefined, helicalGear: undefined } : part)));
  }
}

function isDisplayCadEdge(edge: CollectedCadEdgeGeometry) {
  if (!edge.manifold || edge.boundary || edge.points.length < 6) return false;
  const effectiveAngle = Math.min(edge.angle, 180 - edge.angle);
  const touchesCurvedSurface = edge.surfaceTypes.some((surfaceType) => CURVED_SURFACE_TYPES.has(surfaceType));
  const isCurvedEdge = edge.curveType !== "line";
  return effectiveAngle + 1e-3 >= CAD_DISPLAY_EDGE_MIN_ANGLE || touchesCurvedSurface || isCurvedEdge;
}

function treatmentDetailFaceAreaLimit(faceAreas: number[]) {
  const finiteAreas = faceAreas.filter((area) => Number.isFinite(area) && area > 1e-8);
  if (finiteAreas.length === 0) return 0;
  return Math.max(1e-8, Math.max(...finiteAreas) * 0.3);
}

function touchesTreatmentDetailFace(edge: CollectedCadEdgeGeometry, areaLimit: number) {
  return areaLimit > 0 && edge.faceAreas.some((area) => area > 0 && area <= areaLimit);
}

function isModifierDisplayCadEdge(edge: CollectedCadEdgeGeometry, treatmentAreaLimit: number) {
  return isDisplayCadEdge(edge) && !touchesTreatmentDetailFace(edge, treatmentAreaLimit);
}

function releaseHandles(cad: OcctKernel, handles: ShapeHandle[]) {
  handles.forEach((handle) => {
    try {
      cad.release(handle);
    } catch {
      // A failed topology operation can invalidate temporary handles.
    }
  });
}

function collectEdges(cad: OcctKernel, shape: ShapeHandle, sharpAngle: number, suppressTreatmentDetailEdges = false, retainEdgeHandles = false) {
  const handles = cad.getSubShapes(shape, "edge");
  const faces = cad.getSubShapes(shape, "face");
  let keepEdgeHandles = false;
  try {
    const faceByHash = new Map(faces.map((face) => [cad.hashCode(face, HASH_UPPER_BOUND), face]));
    const faceAreaByHash = new Map<number, number>();
    faces.forEach((face) => {
      const hash = cad.hashCode(face, HASH_UPPER_BOUND);
      let area = 0;
      try {
        area = Math.abs(cad.getSurfaceArea(face));
      } catch {
        area = 0;
      }
      faceAreaByHash.set(hash, area);
    });
    const treatmentAreaLimit = suppressTreatmentDetailEdges ? treatmentDetailFaceAreaLimit([...faceAreaByHash.values()]) : 0;
    const adjacentFaces = parseEdgeFaceMap(cad.edgeToFaceMap(shape, HASH_UPPER_BOUND));
    const wire = cad.wireframe(shape, CAD_EDGE_WIREFRAME_DEFLECTION);
    const pointsByHash = new Map<number, number[]>();
    for (let index = 0; index + 2 < wire.edgeGroups.length; index += 3) {
      const start = wire.edgeGroups[index];
      const count = wire.edgeGroups[index + 1];
      const hash = wire.edgeGroups[index + 2];
      if (!pointsByHash.has(hash)) pointsByHash.set(hash, Array.from(wire.points.slice(start, start + count)));
    }

    const collectedEdges = handles.map((handle, id) => {
      const hash = cad.hashCode(handle, HASH_UPPER_BOUND);
      const faceHashes = adjacentFaces.get(hash) ?? [];
      const points = pointsByHash.get(hash) ?? [];
      const classification = edgeAngle(cad, points, faceHashes, faceByHash);
      const faceAreas = faceHashes.map((faceHash) => faceAreaByHash.get(faceHash) ?? 0);
      const surfaceTypes = faceHashes
        .map((faceHash) => faceByHash.get(faceHash))
        .filter((face): face is ShapeHandle => face !== undefined)
        .map((face) => {
          try {
            return cad.surfaceType(face);
          } catch {
            return "unknown";
          }
        });
      let curveType = "line";
      try {
        curveType = cad.curveType(handle);
      } catch {
        curveType = "unknown";
      }
      return { id, points, ...classification, curveType, surfaceTypes, faceAreas };
    }).filter((edge) => edge.points.length >= 6);
    const edges: CollectedCadEdge[] = collectedEdges.map((edge) => {
      const display = treatmentAreaLimit > 0 ? isModifierDisplayCadEdge(edge, treatmentAreaLimit) : isDisplayCadEdge(edge);
      return {
        ...edge,
        display,
        selectable: cadModifierTopologyEdgeIsSelectable(edge),
      };
    });
    const selectableEdgeIds = edges.filter((edge) => edge.selectable && edge.angle + 1e-3 >= sharpAngle).map((edge) => edge.id);
    const displayEdges = cadDisplayEdgesFromCollected(edges);
    keepEdgeHandles = retainEdgeHandles;
    return { handles, edges: edges.map(({ curveType: _curveType, surfaceTypes: _surfaceTypes, faceAreas: _faceAreas, ...edge }) => edge), selectableEdgeIds, displayEdges };
  } finally {
    releaseHandles(cad, faces);
    if (!keepEdgeHandles) releaseHandles(cad, handles);
  }
}

function cadDisplayEdgesFromCollected(edges: CollectedCadEdge[]): CadModifierDisplayEdge[] {
  return edges
    .filter((edge) => edge.display)
    .map((edge) => ({ points: edge.points }));
}

function tessellationOptions(deflection: CadModifierDeflection) {
  return { linearDeflection: deflection.linear, angularDeflection: deflection.angular };
}

function copyCadMesh(mesh: { positions: Float32Array; normals: Float32Array; indices: Uint32Array; triangleCount: number }) {
  return {
    positions: new Float32Array(mesh.positions),
    normals: new Float32Array(mesh.normals),
    indices: new Uint32Array(mesh.indices),
    triangleCount: mesh.triangleCount,
  };
}

function isImportStlWasmFault(message: string) {
  return /importStl:.*WebAssembly\.Exception/i.test(message);
}

function isMissingValidatorFault(message: string) {
  return /isValid/i.test(message) && /null|not a function|undefined/i.test(message);
}

function verwirfKernel(cad: OcctKernel | null) {
  // Nur die Verweise fallenzulassen reicht nicht: der alte Kernel haelt seinen
  // eigenen WebAssembly-Speicher fest, und daneben ist fuer einen zweiten kein
  // Platz. occt-wasm bietet dafuer Symbol.dispose an.
  try {
    (cad as unknown as { [key: symbol]: (() => void) | undefined })?.[Symbol.dispose]?.();
  } catch {
    // Ein Kernel, der schon nicht mehr antwortet, laesst sich auch nicht mehr abbauen.
  }
  kernelPromise = null;
  baseShape = null;
  baseSolids = [];
  edgeHandles = [];
  edgeOwners = [];
}

// Testing each edge alone costs one kernel call per edge, on a heavy body a
// second or more each. Past this budget the whole component is reported
// instead, so a refusal never comes near the preview's 30 s watchdog.
const CULPRIT_SEARCH_BUDGET_MS = 1500;

class EdgeTreatmentError extends Error {
  constructor(message: string, readonly failedEdgeIds: number[]) {
    super(message);
  }
}

function treatEdges(cad: OcctKernel, solid: ShapeHandle, edges: ShapeHandle[], request: Extract<CadModifierWorkerRequest, { type: "preview" }>) {
  return request.kind === "fillet"
    ? cad.fillet(solid, edges, request.amount)
    : Math.abs(request.chamferAngle - 45) < 0.001
      ? cad.chamfer(solid, edges, request.amount)
      : cad.chamferDistAngle(solid, edges, request.amount, request.chamferAngle);
}

// The kernel only says that the set failed. The edges that fail on their own
// are the ones to blame; when every edge works alone, it is the combination.
function culpritEdgeIds(cad: OcctKernel, solid: ShapeHandle, entries: { id: number; edge: ShapeHandle }[], request: Extract<CadModifierWorkerRequest, { type: "preview" }>) {
  const all = entries.map((entry) => entry.id);
  if (entries.length <= 1 || request.addedEdgeIds?.length) return all;
  const deadline = performance.now() + CULPRIT_SEARCH_BUDGET_MS;
  const failing: number[] = [];
  for (const entry of entries) {
    if (performance.now() > deadline) return all;
    try {
      const single = treatEdges(cad, solid, [entry.edge], request);
      const solidLeft = cadHasSolidBody(cad, single);
      releaseHandles(cad, [single]);
      if (!solidLeft) failing.push(entry.id);
    } catch (error) {
      if (isFatalKernelFault(error)) throw error;
      failing.push(entry.id);
    }
  }
  return failing.length ? failing : all;
}

async function bearbeiteAnfrage(request: CadModifierWorkerRequest, halter: { cad: OcctKernel | null }) {
  const cad = await kernel();
  halter.cad = cad;
  const activeCad = cad;
  if (request.type === "dispose") {
    releaseSession(activeCad);
    post({ type: "disposed", requestId: request.requestId });
    return;
  }
  if (request.type === "prepare") {
    releaseSession(activeCad);
    baseShape = reconstructPartsWithFallback(activeCad, request.parts);
    const collected = collectEdges(activeCad, baseShape, request.sharpAngle, Boolean(request.suppressTreatmentDetailEdges), true);
    edgeHandles = collected.handles;
    baseSolids = activeCad.isSolid(baseShape) ? [baseShape] : activeCad.getSubShapes(baseShape, "solid");
    if (baseSolids.length === 0) throw new Error("The selected group contains no closed solid components");
    const ownerEdgeHandles = baseSolids.map((solid) => activeCad.getSubShapes(solid, "edge"));
    try {
      const ownerCandidates = new Map<number, Array<{ owner: number; edge: ShapeHandle }>>();
      ownerEdgeHandles.forEach((componentEdges, owner) => {
        componentEdges.forEach((edge) => {
          const hash = activeCad.hashCode(edge, HASH_UPPER_BOUND);
          const candidates = ownerCandidates.get(hash) ?? [];
          candidates.push({ owner, edge });
          ownerCandidates.set(hash, candidates);
        });
      });
      edgeOwners = edgeHandles.map((edge) => {
        const hash = activeCad.hashCode(edge, HASH_UPPER_BOUND);
        const candidates = ownerCandidates.get(hash) ?? [];
        const exact = candidates.find((candidate) => activeCad.isSame(edge, candidate.edge));
        if (!exact) throw new Error("A CAD edge could not be mapped to its solid component; restart the edge tool");
        return exact.owner;
      });
    } finally {
      ownerEdgeHandles.forEach((componentEdges) => releaseHandles(activeCad, componentEdges));
    }
    post({
      type: "ready",
      requestId: request.requestId,
      edges: collected.edges.map((edge) => ({ ...edge, owner: edgeOwners[edge.id] ?? 0 })),
      selectableEdgeIds: collected.selectableEdgeIds,
      sourceType: activeCad.getShapeType(baseShape),
    });
    return;
  }
  if (baseShape === null) throw new Error("Prepare an object before previewing the modifier");
  const selected = request.edgeIds.map((id) => ({ id, edge: edgeHandles[id], owner: edgeOwners[id] })).filter((entry): entry is { id: number; edge: ShapeHandle; owner: number } => entry.edge !== undefined);
  if (selected.length === 0 && request.kind !== "shell") throw new Error("Select at least one highlighted edge");
  const componentResults: ShapeHandle[] = [];
  let result: ShapeHandle | null = null;
  try {
    for (let owner = 0; owner < baseSolids.length; owner += 1) {
      const solid = baseSolids[owner];
      const componentEntries = selected.filter((entry) => entry.owner === owner);
      const componentEdges = componentEntries.map((entry) => entry.edge);
      let component: ShapeHandle;
      if (request.kind === "shell") {
        component = shellSolid(activeCad, solid, request.amount, request.shellOpenings ?? "none", request.shellEdges);
      } else if (componentEdges.length === 0) {
        component = activeCad.copy(solid);
      } else {
        try {
          component = treatEdges(activeCad, solid, componentEdges, request);
        } catch (error) {
          if (isFatalKernelFault(error)) throw error;
          const rawMessage = error instanceof Error ? error.message : String(error ?? "");
          throw new EdgeTreatmentError(rawMessage, culpritEdgeIds(activeCad, solid, componentEntries, request));
        }
      }
      if (request.kind !== "shell" && componentEdges.length > 0 && !cadHasSolidBody(activeCad, component)) {
        // Past a certain size the kernel returns a "valid" compound without any
        // solid in it (and a volume that grew): not a body to go on with.
        releaseHandles(activeCad, [component]);
        throw new Error("The chosen size does not leave a closed solid");
      }
      componentResults.push(component);
    }
    result = componentResults.length === 1 ? componentResults[0] : activeCad.makeCompound(componentResults);
    if (!cadShapeIsValid(activeCad, result)) throw new Error("The chosen size creates invalid or overlapping edge geometry");
    const loose = cadModifierTessellationDeflection(request.quality, request.amount, request.minDeflection);
    const meshed = meshTreatedBody(activeCad, [...componentResults], result, loose, cadModifierCappedDeflection(request.quality, loose));
    // The body may have been replaced by fresh copies, meshed with the old angle.
    componentResults.splice(0, componentResults.length, ...meshed.components);
    result = meshed.result;
    const deflection = meshed.deflection;
    const options = tessellationOptions(deflection);
    const mesh = copyCadMesh(meshed.mesh);
    const displayEdges = collectEdges(activeCad, result, 0).displayEdges;
    const brep = storedBrep(activeCad, result);
    const components: CadModifierComponentMesh[] = componentResults.map((component, owner) => {
      const componentMesh = copyCadMesh(activeCad.tessellate(component, options));
      return {
        owner,
        positions: componentMesh.positions,
        normals: componentMesh.normals,
        indices: componentMesh.indices,
        triangleCount: componentMesh.triangleCount,
        brep: storedBrep(activeCad, component),
        displayEdges: collectEdges(activeCad, component, 0).displayEdges,
      };
    });
    post(
      { type: "preview", requestId: request.requestId, positions: mesh.positions, normals: mesh.normals, indices: mesh.indices, triangleCount: mesh.triangleCount, brep, displayEdges, components, deflection },
      [
        mesh.positions.buffer,
        mesh.normals.buffer,
        mesh.indices.buffer,
        ...components.flatMap((component) => [component.positions.buffer, component.normals.buffer, component.indices.buffer]),
      ],
    );
  } finally {
    componentResults.forEach((component) => activeCad.release(component));
    if (result !== null && componentResults.length > 1) activeCad.release(result);
  }
}

self.onmessage = async (event: MessageEvent<CadModifierWorkerRequest>) => {
  const request = event.data;
  const halter: { cad: OcctKernel | null } = { cad: null };
  let error: unknown = null;
  try {
    await bearbeiteAnfrage(request, halter);
    return;
  } catch (ersterFehler) {
    error = ersterFehler;
  }

  if (request.type === "prepare" && isCadModifierKernelExhausted(
    error instanceof Error ? error.message : String(error ?? ""),
    error instanceof Error ? error.name : "",
  )) {
    // Ein neuer Kernel in derselben Aufgabe scheitert genauso - der alte haelt
    // seinen Speicher noch. Deshalb nur abbauen und melden: der naechste Anlauf
    // bekommt einen frischen und kommt durch.
    verwirfKernel(halter.cad);
    post({
      type: "error",
      requestId: request.requestId,
      message: CAD_MODIFIER_KERNEL_RESTART_MESSAGE,
      resetSession: true,
    });
    return;
  }

  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const errorName = error instanceof Error ? error.name : "";
  if (isCadModifierWasmMemoryFault(rawMessage, errorName) || isImportStlWasmFault(rawMessage) || isMissingValidatorFault(rawMessage)) {
    if (halter.cad) releaseSession(halter.cad);
    kernelPromise = null;
    const message = isImportStlWasmFault(rawMessage)
      ? "The selected mesh could not be converted into a closed CAD solid. The CAD kernel reset; try Separate Parts, ungrouping, or simplifying the object before adding edge features."
      : isMissingValidatorFault(rawMessage)
        ? "The CAD kernel exposed an incomplete validation function and reset. Start the edge tool again; no page refresh is needed."
      : "The CAD kernel hit a memory fault and reset. Start the edge tool again; no page refresh is needed.";
    post({
      type: "error",
      requestId: request.requestId,
      message,
      resetSession: true,
    });
    return;
  }
  const kernelRefused = request.type === "preview" && (rawMessage.includes("WebAssembly.Exception") || rawMessage.includes("fillet:") || rawMessage.includes("chamfer:") || rawMessage.includes("chamferDistAngle:"));
  const message = kernelRefused
    ? request.kind === "shell"
      ? "The walls cannot be this thick for this body. Choose a thinner wall."
      : `The selected edges cannot be ${request.kind === "fillet" ? "filleted" : "chamfered"} together at this size. Reduce the size or select fewer connected edges.`
    : rawMessage || "The CAD kernel could not complete this edge treatment";
  if (request.type === "prepare" && halter.cad) releaseSession(halter.cad);
  const failedEdgeIds = kernelRefused && error instanceof EdgeTreatmentError ? error.failedEdgeIds : undefined;
  post({ type: "error", requestId: request.requestId, message, ...(failedEdgeIds ? { failedEdgeIds } : {}) });
};

export {};
