import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { bandLevels, sliceMeshAtHeights, slicePositionsAtHeights, twistBandCount } from "@/lib/heightSlices";

type Vec3 = [number, number, number];

function boxMesh() {
  const geometry = new THREE.BoxGeometry(20, 30, 20).toNonIndexed();
  const position = geometry.getAttribute("position");
  const vertices: Vec3[] = [];
  const faces: Array<[number, number, number]> = [];
  for (let index = 0; index < position.count; index += 3) {
    for (let corner = 0; corner < 3; corner += 1) vertices.push([position.getX(index + corner), position.getY(index + corner) + 15, position.getZ(index + corner)]);
    faces.push([index, index + 1, index + 2]);
  }
  return { vertices, faces };
}

function volume(vertices: Vec3[], faces: Array<[number, number, number]>) {
  return faces.reduce((sum, [a, b, c]) => {
    const [p, q, r] = [vertices[a], vertices[b], vertices[c]];
    return sum + (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6;
  }, 0);
}

/** Every edge used by exactly two faces, once each way: a closed, consistently wound mesh. */
function closed(faces: Array<[number, number, number]>, vertices: Vec3[]) {
  const key = (v: Vec3) => v.map((x) => Math.round(x * 1e5)).join(",");
  const count = new Map<string, number>();
  faces.forEach((face) => face.forEach((a, i) => {
    const b = face[(i + 1) % 3];
    const id = `${key(vertices[a])}>${key(vertices[b])}`;
    count.set(id, (count.get(id) ?? 0) + 1);
  }));
  return [...count.keys()].every((id) => {
    const [a, b] = id.split(">");
    return count.get(id) === 1 && count.get(`${b}>${a}`) === 1;
  });
}

describe("cutting a mesh into bands for a twist (#184)", () => {
  it("needs a band every 2.5 degrees", () => {
    expect(twistBandCount(0)).toBe(1);
    expect(twistBandCount(5)).toBe(2);
    expect(twistBandCount(90)).toBe(36);
    expect(twistBandCount(-180)).toBe(72);
    expect(bandLevels(0, 30, 3)).toEqual([10, 20]);
  });

  it("cuts a box into bands and keeps it closed, with the same volume", () => {
    const { vertices, faces } = boxMesh();
    const sliced = sliceMeshAtHeights(vertices, faces, bandLevels(0, 30, 12));
    expect(sliced.faces.length).toBeGreaterThan(faces.length * 4);
    expect(Math.abs(volume(sliced.vertices, sliced.faces))).toBeCloseTo(20 * 30 * 20, 6);
    expect(closed(sliced.faces, sliced.vertices)).toBe(true);
    // Every height of a band has its ring of points.
    const heights = new Set(sliced.vertices.map((v) => Math.round(v[1] * 1000) / 1000));
    for (const level of bandLevels(0, 30, 12)) expect(heights.has(Math.round(level * 1000) / 1000)).toBe(true);
  });

  it("does the same for a flat list of corners", () => {
    const geometry = new THREE.BoxGeometry(20, 30, 20).toNonIndexed();
    const flat = slicePositionsAtHeights(geometry.getAttribute("position").array, [0, 5, -5]);
    expect(flat.length % 9).toBe(0);
    expect(flat.length / 9).toBeGreaterThan(12);
  });
});
