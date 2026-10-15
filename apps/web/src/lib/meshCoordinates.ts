export type MeshPoint = readonly [number, number, number];

/** Maps the Z-up coordinate convention used by slicers/CAD files into Layerling's Y-up scene. */
export function zUpToLayerling([x, y, z]: MeshPoint): [number, number, number] {
  return [x, z, -y];
}

/** Maps Layerling's Y-up scene into the Z-up coordinate convention expected by slicers. */
export function layerlingToZUp([x, y, z]: MeshPoint): [number, number, number] {
  return [x, -z, y];
}
