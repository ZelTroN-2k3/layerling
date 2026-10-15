import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import { rectangleOutline, normalizeHolePattern } from "@/lib/holePattern";
import { holePatternShapes } from "@/lib/holePatternShapes";
import { createLocalId } from "@/lib/localIds";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import { DEFAULT_HONEYCOMB_CELL_SIZE, DEFAULT_HONEYCOMB_FRAME_WIDTH, DEFAULT_HONEYCOMB_WALL_THICKNESS } from "@/lib/honeycombGeometry";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The Honeycomb is no longer a shape of its own (#223): the hole pattern tool
 * makes the same thing - a plate with hexagonal holes - from a box and hole
 * shapes grouped with it. A honeycomb in an older design is turned into that
 * automatically. This is the part that works out the box and the holes; the
 * editor groups them.
 *
 * The holes are the cells in the honeycomb's own frame: the same cell size,
 * the same wall between them, the same frame around, staggered rows with the
 * corners of the hexagons pointing along the depth. Only where the grid starts
 * differs, because the pattern is centred on the face.
 *
 * A honeycomb that is a hole itself (a cutter that leaves the cells' walls
 * behind) has no counterpart and stays as it is.
 */
export function honeycombReplacementParts(shape: WorkplaneShape): { body: WorkplaneShape; holes: WorkplaneShape[] } | null {
  if (shape.kind !== "honeycomb" || shape.hole) return null;
  const boxAsset = toolbarShapeAssets.find((asset) => asset.kind === "box");
  if (!boxAsset) return null;

  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const cell = shape.honeycombCellSize ?? DEFAULT_HONEYCOMB_CELL_SIZE;
  const wall = shape.honeycombWallThickness ?? DEFAULT_HONEYCOMB_WALL_THICKNESS;
  const frame = shape.honeycombFrameWidth ?? DEFAULT_HONEYCOMB_FRAME_WIDTH;

  const turn = quaternionForShape(shape);
  const centre = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + height / 2, shape.z);
  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(turn);
  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(turn);
  const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(turn);
  const origin = centre.clone().addScaledVector(normal, height / 2);
  const point = (vector: THREE.Vector3) => ({ x: vector.x, y: vector.y, z: vector.z });

  const settings = normalizeHolePattern({
    form: "hexagon",
    // The cell size is the distance across the flats; the tool measures across the corners.
    size: (cell * 2) / Math.sqrt(3),
    spacing: cell + wall,
    arrangement: "staggered",
    margin: Math.max(0.1, frame),
    depth: null,
  });
  const plan = holePatternShapes(
    {
      workplane: { origin: point(origin), normal: point(normal), xAxis: point(xAxis), zAxis: point(zAxis) },
      outline: rectangleOutline(-width / 2, -depth / 2, width / 2, depth / 2),
      thickness: height,
    },
    settings,
    shape.name,
  );
  if (plan.tooMany || plan.holes.length === 0) return null;

  const made = makeShapeFromAsset(boxAsset, { x: shape.x, z: shape.z, elevation: shape.elevation ?? 0 }, { width, depth, height });
  const body: WorkplaneShape = {
    ...made,
    id: createLocalId("box"),
    name: shape.name,
    color: shape.color,
    rotation: shape.rotation,
    rotationX: shape.rotationX,
    rotationZ: shape.rotationZ,
    mirrorX: shape.mirrorX,
    mirrorY: shape.mirrorY,
    mirrorZ: shape.mirrorZ,
  };
  return { body, holes: plan.holes };
}
