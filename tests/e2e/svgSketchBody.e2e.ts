// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { OcctKernel } from "occt-wasm";
import { cadSketchRegions, silhouetteSketchProfile, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import { strokedSketchProfile } from "@/lib/sketchStroke";
import { importedShapeFromSvg } from "@/lib/svgImport";
import { sketchProfileFromSvg } from "@/lib/svgSketch";
import type { SketchProfile } from "@/types/layerling";

/*
 * #197: an SVG built as a sketch body by the real OCCT kernel, the way the sketch worker builds it:
 * one face per outline with its holes, lines and Bezier curves as they are. The body must be a
 * valid solid with the volume of the mesh import, and the fills on top - silhouette, a stroke
 * outside it - must build as well.
 */

const OUTLINE_WITH_HOLE = `<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="80mm" viewBox="0 0 60 80">
  <g transform="translate(0,-217)">
    <path d="M 30.000236 217 A 30 30 0 0 0 0 247.00024 A 30 30 0 0 0 14.850256 272.89375 L 14.850256 296.99977 L 19.849951 296.99977 L 19.849951 271.99974 L 40.150004 271.99974 L 40.150004 296.99977 L 45.150216 296.99977 L 45.150216 272.89375 A 30 30 0 0 0 59.999955 247.00024 A 30 30 0 0 0 30.000236 217 z M 30.000236 226.99991 A 20 20 0 0 1 50.000049 247.00024 A 20 20 0 0 1 30.000236 267.00005 A 20 20 0 0 1 9.9999064 247.00024 A 20 20 0 0 1 30.000236 226.99991 z " />
  </g>
</svg>`;

const HEIGHT = 4;

let cad: OcctKernel;
let runtime: ManifoldToplevel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
  runtime = await manifoldModule();
  runtime.setup();
});

function pathWire(path: OrderedCadSketchPath) {
  const edges = path.steps.map(({ segment, from, to }) => {
    const forward = segment.startId === from.id;
    const first = forward ? from.handleOut : from.handleIn;
    const second = forward ? to.handleIn : to.handleOut;
    if (segment.kind !== "line" && first && second) {
      return cad.makeBezierEdge([
        { x: from.x, y: 0, z: from.z },
        { x: first.x, y: 0, z: first.z },
        { x: second.x, y: 0, z: second.z },
        { x: to.x, y: 0, z: to.z },
      ]);
    }
    return cad.makeLineEdge({ x: from.x, y: 0, z: from.z }, { x: to.x, y: 0, z: to.z });
  });
  return cad.makeWire(edges);
}

/** As the sketch worker builds an extrusion, with the silhouette and stroke the editor applies first. */
function build(profile: SketchProfile) {
  let source = profile.silhouette ? silhouetteSketchProfile(profile) : profile;
  if (profile.stroke) {
    const stroked = strokedSketchProfile(runtime, source);
    expect(stroked).not.toBeNull();
    source = stroked!;
  }
  const regions = cadSketchRegions(source);
  const solids = regions.map((region) => {
    let face = cad.makeFace(pathWire(region.outer));
    if (region.holes.length) face = cad.addHolesInFace(face, region.holes.map(pathWire));
    return cad.extrude(face, 0, HEIGHT, 0);
  });
  const solid = solids.length === 1 ? solids[0] : cad.makeCompound(solids);
  expect(cad.isValid(solid)).toBe(true);
  return { solid, regions };
}

function meshVolume(source: string) {
  const positions = importedShapeFromSvg("test.svg", source).importedMesh!.positions;
  let volume = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(i, i + 9);
    volume += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return Math.abs(volume / 6);
}

describe("SVG sketch bodies with the real OCCT kernel (#197)", () => {
  it("builds the reporter's outline as one valid solid with its hole, as large as the mesh", () => {
    const profile = sketchProfileFromSvg(OUTLINE_WITH_HOLE)!;
    const { solid, regions } = build(profile);
    expect(regions).toHaveLength(1);
    expect(regions[0].holes).toHaveLength(1);
    const volume = cad.getVolume(solid);
    const mesh = meshVolume(OUTLINE_WITH_HOLE);
    expect(Math.abs(volume - mesh) / mesh).toBeLessThan(0.01);
    const box = cad.getBoundingBox(solid);
    expect(box.xmax - box.xmin).toBeCloseTo(60, 2);
    expect(box.zmax - box.zmin).toBeCloseTo(80, 2);
    // Exact curves: a fillet on the top edges goes through.
    const top = cad.getSubShapes(solid, "edge").filter((edge) => {
      const edgeBox = cad.getBoundingBox(edge);
      return Math.abs(edgeBox.ymin - HEIGHT) < 1e-6 && Math.abs(edgeBox.ymax - HEIGHT) < 1e-6;
    });
    expect(top.length).toBeGreaterThan(4);
    expect(cad.isValid(cad.fillet(solid, top, 0.5))).toBe(true);
  });

  it("builds the silhouette without the hole, and with an outside stroke a cutter round it", () => {
    const profile = sketchProfileFromSvg(OUTLINE_WITH_HOLE)!;
    const full = cad.getVolume(build(profile).solid);
    const silhouette = build({ ...profile, silhouette: true });
    expect(silhouette.regions[0].holes).toHaveLength(0);
    // The hole is a 20 mm disc.
    expect(cad.getVolume(silhouette.solid) - full).toBeCloseTo(Math.PI * 20 * 20 * HEIGHT, -1);
    const cutter = build({ ...profile, silhouette: true, stroke: { width: 1.2, align: "outside", join: "round", cap: "flat" } });
    // One wall round the outside: a single region with one hole, the silhouette itself.
    expect(cutter.regions).toHaveLength(1);
    expect(cutter.regions[0].holes).toHaveLength(1);
    const box = cad.getBoundingBox(cutter.solid);
    expect(box.xmax - box.xmin).toBeCloseTo(60 + 2.4, 1);
    // Without the silhouette the outside stroke runs round the hole's edge too.
    const both = build({ ...profile, stroke: { width: 1.2, align: "outside", join: "round", cap: "flat" } });
    expect(both.regions.length).toBe(2);
  });

  it("builds circles, rotated ellipses, quadratic curves and rounded rectangles", () => {
    [
      `<circle cx="50" cy="50" r="40" />`,
      `<ellipse cx="100" cy="100" rx="60" ry="25" transform="rotate(30 100 100)" />`,
      `<path d="M 10 100 Q 100 0 190 100 Q 100 200 10 100 Z" />`,
      `<rect x="10" y="20" width="80" height="40" rx="10" />`,
    ].forEach((body) => {
      const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${body}</svg>`;
      const { solid } = build(sketchProfileFromSvg(source)!);
      const mesh = meshVolume(source);
      expect(Math.abs(cad.getVolume(solid) - mesh) / mesh).toBeLessThan(0.01);
    });
  });
});
