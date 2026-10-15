import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { planarMeshFaces } from "@/lib/cadPlanarMesh";

/**
 * A nine-sided prism with a corner cut off by a tilted plane, as Split leaves it: a mesh with float32
 * corners (#248). Its side faces are flat only to a millionth of a millimetre, so the kernel's plain
 * sewing leaves one side in four pieces and fillet or chamfer on the new triangle's edges fail.
 */
const POSITIONS = [
  -8.660253524780273, 0, -5, -8.660253524780273, 20, -5, 0, 0, -10,
  -8.660253524780273, 0, -5, 0, 0, -10, 0, 0, 0,
  -8.660253524780273, 0, -5, 0, 0, 0, -8.660253524780273, 0, 5,
  -8.660253524780273, 0, -5, -8.660253524780273, 0, 5, -8.660253524780273, 20, 5,
  -8.660253524780273, 0, 5, 0, 0, 0, 0, 0, 10,
  -8.660253524780273, 0, 5, 0, 0, 10, 0, 20, 10,
  -8.660253524780273, 0, -5, -8.660253524780273, 20, 5, -8.660253524780273, 20, -5,
  -8.660253524780273, 20, -5, -5.831813812255859, 20, -6.633003234863281, 0, 16.63300132751465, -10,
  -8.660253524780273, 20, -5, 0, 20, 0, -5.831813812255859, 20, -6.633003234863281,
  -8.660253524780273, 20, -5, 0, 16.63300132751465, -10, 0, 0, -10,
  -8.660253524780273, 0, 5, 0, 20, 10, -8.660253524780273, 20, 5,
  -8.660253524780273, 20, -5, -8.660253524780273, 20, 5, 0, 20, 0,
  -8.660253524780273, 20, 5, 0, 20, 10, 0, 20, 0,
  0, 0, -10, 8.660253524780273, 0, -5, 0, 0, 0,
  0, 0, -10, 5.831813812255859, 20, -6.633003234863281, 8.660253524780273, 0, -5,
  8.660253524780273, 0, -5, 8.660253524780273, 20, -5, 8.660253524780273, 0, 5,
  0, 0, 0, 8.660253524780273, 0, 5, 0, 0, 10,
  8.660253524780273, 0, -5, 8.660253524780273, 0, 5, 0, 0, 0,
  0, 0, 10, 8.660253524780273, 0, 5, 8.660253524780273, 20, 5,
  0, 0, -10, 0, 16.63300132751465, -10, 5.831813812255859, 20, -6.633003234863281,
  8.660253524780273, 20, -5, 5.831813812255859, 20, -6.633003234863281, -5.831813812255859, 20, -6.633003234863281,
  8.660253524780273, 20, -5, -5.831813812255859, 20, -6.633003234863281, 0, 20, 0,
  8.660253524780273, 0, -5, 5.831813812255859, 20, -6.633003234863281, 8.660253524780273, 20, -5,
  0, 0, 10, 8.660253524780273, 20, 5, 0, 20, 10,
  0, 20, 0, 0, 20, 10, 8.660253524780273, 20, 5,
  8.660253524780273, 0, 5, 8.660253524780273, 20, -5, 8.660253524780273, 20, 5,
  8.660253524780273, 20, -5, 0, 20, 0, 8.660253524780273, 20, 5,
  0, 16.63300132751465, -10, -5.831813812255859, 20, -6.633003234863281, 5.831813812255859, 20, -6.633003234863281,
];

let cad: OcctKernel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
});

function stl(positions: number[]) {
  const lines = ["solid layerling"];
  for (let o = 0; o + 8 < positions.length; o += 9) {
    lines.push("facet normal 0 0 0", "outer loop");
    for (let k = 0; k < 3; k += 1) lines.push(`vertex ${positions[o + k * 3]} ${positions[o + k * 3 + 1]} ${positions[o + k * 3 + 2]}`);
    lines.push("endloop", "endfacet");
  }
  lines.push("endsolid layerling");
  return lines.join("\n");
}

function plainSolid() {
  let shape = cad.fixShape(cad.importStl(stl(POSITIONS)));
  const faces = cad.getSubShapes(cad.importStl(stl(POSITIONS)), "face");
  shape = cad.sewAndSolidify(faces, 1e-5);
  shape = cad.healSolid(cad.fixShape(shape), 1e-5);
  shape = cad.fixFaceOrientations(shape);
  return cad.unifySameDomain(cad.removeDegenerateEdges(shape));
}

function flatSolid() {
  const flat = planarMeshFaces(cad, POSITIONS)!;
  const shape = cad.healSolid(cad.fixShape(cad.sewAndSolidify(flat.faces, 1e-6)), 1e-6);
  return cad.unifySameDomain(cad.removeDegenerateEdges(cad.fixFaceOrientations(shape)));
}

/** The three edges of the cut triangle: the face of about 27.8 mm squared. */
function cutEdges(solid: ReturnType<typeof flatSolid>) {
  const edges = cad.getSubShapes(solid, "edge");
  const face = cad.getSubShapes(solid, "face").find((candidate) => Math.abs(cad.getSurfaceArea(candidate) - 27.77) < 0.3)!;
  return cad.getSubShapes(face, "edge").map((edge) => edges.find((other) => cad.isSame(other, edge))!);
}

describe("flat faces of a mesh", () => {
  it("gathers the 28 triangles into the 9 flat faces of the body", () => {
    const flat = planarMeshFaces(cad, POSITIONS)!;
    expect(flat.faceCount).toBe(9);
    expect(flat.faces).toHaveLength(9);
  });

  it("builds a valid solid with those 9 faces", () => {
    const solid = flatSolid();
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    expect(cad.getSubShapes(solid, "face")).toHaveLength(9);
    expect(cad.getVolume(solid)).toBeGreaterThan(0);
  });

  it("lets the edges of the cut triangle be filleted and chamfered together, at any size up to 2 mm", () => {
    const solid = flatSolid();
    const edges = cutEdges(solid);
    expect(edges).toHaveLength(3);
    for (const size of [0.01, 0.3, 1, 2]) {
      expect(cad.isValid(cad.fillet(solid, edges, size))).toBe(true);
      expect(cad.isValid(cad.chamfer(solid, edges, size))).toBe(true);
    }
  });

  it("does the same volume as the mesh", () => {
    expect(cad.getVolume(flatSolid())).toBeCloseTo(cad.getVolume(plainSolid()), 3);
  });

  it("leaves a mesh with no flat faces to the plain way", () => {
    // A single closed tetrahedron: four triangles, each its own face.
    const tetra = [0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 10, 10, 0, 0, 0, 10, 0, 0, 0, 10];
    expect(planarMeshFaces(cad, tetra)).toBeNull();
  });
});
