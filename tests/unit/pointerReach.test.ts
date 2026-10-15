import { describe, expect, it } from "vitest";
import { reachForPointer } from "@/lib/pointerReach";
import { pickTouchTarget } from "@/lib/sketchTouch";

describe("how far a finger reaches (#337)", () => {
  it("stretches a pixel radius for touch and leaves it for a mouse or a pen", () => {
    expect(reachForPointer(10, "touch")).toBe(18);
    expect(reachForPointer(10, "mouse")).toBe(10);
    expect(reachForPointer(10, "pen")).toBe(10);
    expect(reachForPointer(10, null)).toBe(10);
  });

  it("hands a press to the nearest part of the kind that comes first", () => {
    const candidates = [
      { target: "line", tier: "segment" as const, distance: 3 },
      { target: "far point", tier: "point" as const, distance: 19 },
      { target: "near point", tier: "point" as const, distance: 12 },
      { target: "handle", tier: "handle" as const, distance: 23 },
    ];
    expect(pickTouchTarget(candidates)).toBe("handle");
    expect(pickTouchTarget(candidates.slice(0, 3))).toBe("near point");
    expect(pickTouchTarget(candidates.slice(0, 2))).toBe("far point");
    expect(pickTouchTarget(candidates.slice(0, 1))).toBe("line");
  });

  it("takes nothing that lies out of reach", () => {
    expect(pickTouchTarget([{ target: "line", tier: "segment" as const, distance: 17 }])).toBeNull();
    expect(pickTouchTarget([{ target: "point", tier: "point" as const, distance: 21 }])).toBeNull();
    expect(pickTouchTarget([])).toBeNull();
  });
});
