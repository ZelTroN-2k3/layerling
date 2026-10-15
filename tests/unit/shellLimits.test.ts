import { describe, expect, it } from "vitest";
import { shellMaxThickness, shellOpeningsFor, shellOpenSides } from "@/lib/shellLimits";

describe("thickest wall the Hollow tool offers", () => {
  const plate = { width: 40, depth: 30, height: 1 };

  it("ignores the height for a frame open top and bottom", () => {
    // Fratercula's case: a 1 mm frame from a 1 mm plate.
    expect(shellMaxThickness(plate, "top-bottom")).toBe(15);
  });

  it("lets a floor or lid take almost the whole height when one side is open", () => {
    expect(shellMaxThickness({ width: 40, depth: 30, height: 2 }, "top")).toBeCloseTo(1.8);
    expect(shellMaxThickness({ width: 40, depth: 30, height: 2 }, "bottom")).toBeCloseTo(1.8);
  });

  it("shares the height between floor and lid when closed all round", () => {
    expect(shellMaxThickness({ width: 40, depth: 30, height: 2 }, "none")).toBe(1);
  });

  it("is always limited by the narrower side and never drops below the minimum wall", () => {
    expect(shellMaxThickness({ width: 6, depth: 50, height: 100 }, "top")).toBe(3);
    expect(shellMaxThickness({ width: 40, depth: 30, height: 0.1 }, "top")).toBe(0.2);
  });
});

describe("open sides", () => {
  it("reads the old names and lists of sides alike", () => {
    expect(shellOpenSides("top")).toEqual(["top"]);
    expect(shellOpenSides("top-bottom")).toEqual(["top", "bottom"]);
    expect(shellOpenSides("none")).toEqual([]);
    expect(shellOpenSides(undefined)).toEqual([]);
    expect(shellOpenSides(["right", "front", "top"])).toEqual(["top", "front", "right"]);
  });

  it("stores the old name where one fits, a list otherwise", () => {
    expect(shellOpeningsFor([])).toBe("none");
    expect(shellOpeningsFor(["bottom"])).toBe("bottom");
    expect(shellOpeningsFor(["bottom", "top"])).toBe("top-bottom");
    expect(shellOpeningsFor(["front"])).toEqual(["front"]);
    expect(shellOpeningsFor(["back", "top"])).toEqual(["top", "back"]);
  });

  it("lets a wall be as thick as the part is long towards an open side", () => {
    const box = { width: 40, depth: 30, height: 20 };
    // Front open: across the depth only the back wall is left.
    expect(shellMaxThickness(box, ["front"])).toBe(10);
    // Open front and back: the depth no longer limits it.
    expect(shellMaxThickness({ width: 40, depth: 3, height: 20 }, ["front", "back"])).toBe(10);
  });
});

