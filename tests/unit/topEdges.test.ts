import { describe, expect, it } from "vitest";
import { topCadModifierEdgeIds } from "@/lib/topEdges";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";

const edge = (id: number, points: number[]): CadModifierEdge => ({ id, points, display: true, selectable: true, angle: 90, boundary: false, manifold: true });

describe("top edges (#154)", () => {
  // A 10 mm high frame: rim at y = 10, foot at y = 0, one upright edge between them.
  const edges = [
    edge(1, [0, 10, 0, 20, 10, 0]),
    edge(2, [20, 10, 0, 20, 10, 20]),
    edge(3, [0, 0, 0, 20, 0, 0]),
    edge(4, [0, 0, 0, 0, 10, 0]),
  ];

  it("picks the edges whose every point lies at the highest level", () => {
    expect(topCadModifierEdgeIds(edges, [1, 2, 3, 4])).toEqual([1, 2]);
  });

  it("only offers edges the tool can treat", () => {
    expect(topCadModifierEdgeIds(edges, [2, 3])).toEqual([2]);
    expect(topCadModifierEdgeIds([], [])).toEqual([]);
  });
});
