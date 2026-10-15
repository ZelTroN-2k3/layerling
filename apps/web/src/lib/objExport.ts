import type { MeshPoint } from "@/lib/meshCoordinates";

export type ObjExportMesh = {
  name: string;
  /** "#rrggbb"; written as a vertex colour, anything else leaves the body without one. */
  color?: string;
  /** A colour per face, for a body whose parts keep their own colours (#153); wins over `color`. */
  faceColors?: readonly string[];
  vertices: readonly MeshPoint[];
  faces: readonly (readonly [number, number, number])[];
};

const OBJ_WELD_TOLERANCE = 0.00001;

function bucketKey(x: number, y: number, z: number) {
  return `${x}:${y}:${z}`;
}

export function weldMeshVertices(mesh: ObjExportMesh) {
  const vertices: Array<[number, number, number]> = [];
  const buckets = new Map<string, number[]>();
  const remappedIndices: number[] = [];

  mesh.vertices.forEach((sourceVertex) => {
    // OBJ tools conventionally treat Y as up. Keep Layerling's Y-up
    // coordinates here so slicers do not apply their OBJ axis conversion a
    // second time. STL is exported separately using explicit Z-up coordinates.
    const vertex: [number, number, number] = [...sourceVertex];
    const bucketX = Math.floor(vertex[0] / OBJ_WELD_TOLERANCE);
    const bucketY = Math.floor(vertex[1] / OBJ_WELD_TOLERANCE);
    const bucketZ = Math.floor(vertex[2] / OBJ_WELD_TOLERANCE);
    let weldedIndex: number | undefined;

    for (let xOffset = -1; xOffset <= 1 && weldedIndex === undefined; xOffset += 1) {
      for (let yOffset = -1; yOffset <= 1 && weldedIndex === undefined; yOffset += 1) {
        for (let zOffset = -1; zOffset <= 1 && weldedIndex === undefined; zOffset += 1) {
          const candidates = buckets.get(bucketKey(bucketX + xOffset, bucketY + yOffset, bucketZ + zOffset)) ?? [];
          weldedIndex = candidates.find((candidateIndex) => {
            const candidate = vertices[candidateIndex];
            return (
              Math.abs(candidate[0] - vertex[0]) <= OBJ_WELD_TOLERANCE &&
              Math.abs(candidate[1] - vertex[1]) <= OBJ_WELD_TOLERANCE &&
              Math.abs(candidate[2] - vertex[2]) <= OBJ_WELD_TOLERANCE
            );
          });
        }
      }
    }

    if (weldedIndex === undefined) {
      weldedIndex = vertices.length;
      vertices.push(vertex);
      const key = bucketKey(bucketX, bucketY, bucketZ);
      buckets.set(key, [...(buckets.get(key) ?? []), weldedIndex]);
    }
    remappedIndices.push(weldedIndex);
  });

  const faces: Array<[number, number, number]> = [];
  // Which source face each kept face was, so per-face colours stay with their face.
  const kept: number[] = [];
  mesh.faces.forEach(([a, b, c], index) => {
    const face: [number, number, number] = [remappedIndices[a], remappedIndices[b], remappedIndices[c]];
    if (face[0] === face[1] || face[1] === face[2] || face[2] === face[0]) return;
    faces.push(face);
    kept.push(index);
  });

  return { vertices, faces, kept };
}

function objNumber(value: number) {
  return Math.abs(value) < 1e-12 ? "0" : String(value);
}

/**
 * Die Farbe steht als Vertexfarbe hinter jedem Punkt (`v x y z r g b`, 0 bis
 * 1). So bleibt die OBJ eine einzige Datei; Bambu Studio und OrcaSlicer lesen
 * genau das und bieten dann die Zuordnung auf Filamente an, andere Programme
 * nehmen die ersten drei Zahlen. Eine .mtl braeuchte eine zweite Datei, und
 * ein `mtllib` ohne sie laesst OrcaSlicer das Laden abbrechen (Discussion #79).
 */
function objVertexColor(color: string | undefined) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return "";
  const channel = (start: number) => objNumber(Math.round((parseInt(color.slice(start, start + 2), 16) / 255) * 10000) / 10000);
  return ` ${channel(1)} ${channel(3)} ${channel(5)}`;
}

export function exportMeshesToObj(meshes: readonly ObjExportMesh[]) {
  const lines = ["# Layerling OBJ export", "# Y-up, millimetres"];
  let offset = 1;

  meshes.forEach((mesh) => {
    const welded = weldMeshVertices(mesh);
    const color = objVertexColor(mesh.color);
    // OBJ has colours per point only: with colours per face, a point takes the colour of the
    // first face that uses it, so the border between two colours runs along those faces.
    const pointColors: string[] = [];
    if (mesh.faceColors?.length) {
      welded.faces.forEach((face, index) => {
        const faceColor = objVertexColor(mesh.faceColors?.[welded.kept[index]]) || color;
        face.forEach((point) => { pointColors[point] ??= faceColor; });
      });
    }
    lines.push(`o ${mesh.name}`);
    welded.vertices.forEach(([x, y, z], index) => lines.push(`v ${objNumber(x)} ${objNumber(y)} ${objNumber(z)}${pointColors[index] ?? color}`));
    welded.faces.forEach(([a, b, c]) => lines.push(`f ${a + offset} ${b + offset} ${c + offset}`));
    offset += welded.vertices.length;
  });

  return lines.join("\n");
}
