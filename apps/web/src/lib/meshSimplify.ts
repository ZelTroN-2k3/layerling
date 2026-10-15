import { MeshoptSimplifier } from "meshoptimizer/simplifier";

export type SimplifiedMesh = {
  /** Triangle soup, nine numbers per triangle, in the frame of the input. */
  positions: number[];
  triangleCount: number;
};

/**
 * Reduces a triangle soup to about `targetTriangles` triangles.
 *
 * An imported mesh lists every triangle with its own three corners. The
 * simplifier collapses edges, so corners at the same place are first welded
 * into one vertex - otherwise every triangle is an island and the surface
 * tears open. The result keeps the corners it was left with exactly where
 * they were; nothing is moved, so the body stays the size it was.
 *
 * The count is a target, not a promise: the simplifier stops early rather
 * than change the topology (close a hole, merge two walls).
 */
export async function simplifyTrianglePositions(positions: ArrayLike<number>, targetTriangles: number): Promise<SimplifiedMesh> {
  const cornerCount = Math.floor(positions.length / 9) * 3;
  const sourceTriangles = cornerCount / 3;
  const target = Math.max(4, Math.min(sourceTriangles, Math.round(targetTriangles)));
  if (sourceTriangles <= 4 || target >= sourceTriangles) {
    return { positions: Array.from(positions).slice(0, cornerCount * 3), triangleCount: sourceTriangles };
  }

  await MeshoptSimplifier.ready;
  const vertices = new Float32Array(cornerCount * 3);
  for (let index = 0; index < vertices.length; index += 1) vertices[index] = positions[index];

  // weld[corner] is the first corner at the same place: the welded index buffer.
  const weld = MeshoptSimplifier.generatePositionRemap(vertices, 3);
  const welded: number[] = [];
  for (let corner = 0; corner < cornerCount; corner += 3) {
    const a = weld[corner];
    const b = weld[corner + 1];
    const c = weld[corner + 2];
    // A triangle folded onto a line or a point has no area to keep.
    if (a !== b && b !== c && a !== c) welded.push(a, b, c);
  }

  // The corners no triangle points at any more have to go: the simplifier
  // takes two vertices at one place for a seam and will not collapse across it.
  const indices = new Uint32Array(welded);
  const [compact, vertexCount] = MeshoptSimplifier.compactMesh(indices);
  const sourceOfVertex = new Uint32Array(vertexCount);
  const compactVertices = new Float32Array(vertexCount * 3);
  for (let corner = 0; corner < compact.length; corner += 1) {
    const vertex = compact[corner];
    if (vertex === 0xffffffff) continue;
    sourceOfVertex[vertex] = corner;
    compactVertices.set(vertices.subarray(corner * 3, corner * 3 + 3), vertex * 3);
  }

  // The error bound is relative to the size of the mesh; 1 lets the triangle
  // count alone decide where to stop.
  const [kept] = MeshoptSimplifier.simplify(indices, compactVertices, 3, target * 3, 1);

  const result = new Array<number>(kept.length * 3);
  for (let index = 0; index < kept.length; index += 1) {
    const source = sourceOfVertex[kept[index]] * 3;
    result[index * 3] = positions[source];
    result[index * 3 + 1] = positions[source + 1];
    result[index * 3 + 2] = positions[source + 2];
  }
  return { positions: result, triangleCount: kept.length / 3 };
}
