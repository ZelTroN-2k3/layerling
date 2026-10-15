// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { buildSvgExtrusionFromPaths } from "@/lib/svgImport";

/*
 * #197: an Inkscape outline of arcs with a round hole in it. Inkscape closes the outline a
 * fraction of a micrometre short of its start; that sliver made the hole a body of its own.
 * The path is the reporter's, unchanged.
 */
const OUTLINE_WITH_HOLE = `<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="80mm" viewBox="0 0 60 80">
  <g transform="translate(0,-217)">
    <path d="M 30.000236 217 A 30 30 0 0 0 0 247.00024 A 30 30 0 0 0 14.850256 272.89375 L 14.850256 296.99977 L 19.849951 296.99977 L 19.849951 271.99974 L 40.150004 271.99974 L 40.150004 296.99977 L 45.150216 296.99977 L 45.150216 272.89375 A 30 30 0 0 0 59.999955 247.00024 A 30 30 0 0 0 30.000236 217 z M 30.000236 226.99991 A 20 20 0 0 1 50.000049 247.00024 A 20 20 0 0 1 30.000236 267.00005 A 20 20 0 0 1 9.9999064 247.00024 A 20 20 0 0 1 30.000236 226.99991 z " />
  </g>
</svg>`;

describe("SVG import keeps holes (#197)", () => {
  it("cuts the round hole out of an Inkscape outline closed a hair short of its start", () => {
    const parsed = new SVGLoader().parse(OUTLINE_WITH_HOLE);
    const { analysis } = buildSvgExtrusionFromPaths(parsed.paths);
    // The outline is a 30 mm disc on two legs and a bar; the hole a 20 mm disc.
    const disc = Math.PI * 30 * 30;
    const hole = Math.PI * 20 * 20;
    const area = analysis.volume / analysis.height;
    expect(area).toBeLessThan(disc - hole * 0.9 + 400);
    expect(area).toBeGreaterThan(disc - hole - 50);
    expect(analysis.boundaryEdges).toBe(0);
  });
});
