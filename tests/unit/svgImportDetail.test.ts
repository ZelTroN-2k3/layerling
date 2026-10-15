// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildSvgExtrusionFromPaths, parseSvgForImport } from "@/lib/svgImport";

describe("a detailed outline imports (#340)", () => {
  // A traced drawing: one closed outline of thousands of points. Putting its triangles into a list with
  // push(...numbers) hit the limit of a call's arguments and stopped with "Maximum call stack size exceeded".
  function wavyOutline(points: number) {
    const parts: string[] = [];
    for (let index = 0; index < points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const radius = 200 + 12 * Math.sin(angle * 40);
      const x = (250 + Math.cos(angle) * radius).toFixed(3);
      const y = (250 + Math.sin(angle) * radius).toFixed(3);
      parts.push(`${index === 0 ? "M" : "L"}${x},${y}`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><path style="fill:#000000" d="${parts.join(" ")} Z"/></svg>`;
  }

  it("builds a solid from an outline with 8000 points", () => {
    const { rawPositions, analysis } = buildSvgExtrusionFromPaths(parseSvgForImport(wavyOutline(8000)).paths);
    expect(rawPositions.length).toBeGreaterThan(200000);
    expect(analysis.volume).toBeGreaterThan(0);
  });
});
