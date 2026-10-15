// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildSvgExtrusionFromPaths, importedShapeFromSvgWithReport, parseSvgForImport } from "@/lib/svgImport";

describe("an outline that closes a hair beside its start (#258)", () => {
  // Three letters traced in Affinity: every path is written with three decimals, so the T ends
  // 0.001 beside where it began. It was dropped without a word and the logo came without its T.
  const logo = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg width="100%" height="100%" viewBox="0 0 423 334" version="1.1" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd;clip-rule:evenodd;"><g id="outer"><path d="M49.145,44.681l63.833,0l1.458,-4.167l48.333,0l-15,55.5l-48.167,0l0,10.333l59.333,0l-13.167,41l-45.833,0l0,66l-52.5,0l0,-117.833l-13.405,0l15.113,-50.833Z" style="fill:none;stroke:#000;stroke-width:0.5px;"/><path d="M165.044,46.276l64.286,0l2,-4l48.286,0l-14.143,56.429l-27.571,0l0,114.857l-51.714,0l0,-116.857l-35.143,0l14,-50.429Z" style="fill:none;stroke:#000;stroke-width:0.5px;"/><path d="M281.901,48.419l-12.714,49.143l10.429,0l0,116l95.286,0l14.143,-49.286l-58.571,0l0,-116.143l-48.571,0.286Z" style="fill:none;stroke:#000;stroke-width:0.5px;"/></g></svg>`;

  function area(points: Array<[number, number]>) {
    return Math.abs(points.reduce((sum, [x, y], index) => {
      const [nx, ny] = points[(index + 1) % points.length];
      return sum + x * ny - nx * y;
    }, 0)) / 2;
  }

  it("keeps all three letters", () => {
    const parsed = parseSvgForImport(logo);
    const { analysis } = buildSvgExtrusionFromPaths(parsed.paths);
    // The T alone is about 12,000 square units; with its depth of 10 the three bodies add up to its share of the volume.
    const tArea = area([[165.044, 46.276], [229.33, 46.276], [231.33, 42.276], [279.616, 42.276], [265.473, 98.705], [237.902, 98.705], [237.902, 213.562], [186.188, 213.562], [186.188, 96.705], [151.045, 96.705]]);
    expect(analysis.volume).toBeGreaterThan(tArea * 10);
    expect(analysis.width).toBeGreaterThan(330);
  });

  it("builds a body for every letter: the same volume as the letters alone, summed", () => {
    const only = (index: number) => {
      const paths = [...logo.matchAll(/<path [^>]*\/>/g)].map((match) => match[0]);
      const single = logo.replace(/<path [^>]*\/>/g, "").replace("</g>", `${paths[index]}</g>`);
      return buildSvgExtrusionFromPaths(parseSvgForImport(single).paths).analysis.volume;
    };
    const together = buildSvgExtrusionFromPaths(parseSvgForImport(logo).paths).analysis.volume;
    expect(together).toBeCloseTo(only(0) + only(1) + only(2), 3);
    expect(only(1)).toBeGreaterThan(1000);
  });
});

describe("shapes that do not build into a solid are counted (#258)", () => {
  const square = '<path d="M0,0L100,0L100,100L0,100Z" style="fill:#000"/>';
  const wrap = (body: string) => `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">${body}</svg>`;

  it("reports none for a clean drawing", () => {
    expect(importedShapeFromSvgWithReport("clean.svg", wrap(square)).skippedShapes).toBe(0);
  });

  it("reports the shapes left out, and still imports the rest", () => {
    // Two squares joined at one corner, drawn as a single outline that passes through the corner twice.
    const bowTie = '<path d="M150,0L200,0L200,50L250,50L250,100L200,100L200,50L150,50Z" style="fill:#000"/>';
    const report = importedShapeFromSvgWithReport("mixed.svg", wrap(square + bowTie));
    expect(report.skippedShapes).toBeGreaterThanOrEqual(1);
    expect(report.shape.importedMesh?.triangleCount).toBeGreaterThan(0);
  });
});
