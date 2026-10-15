import { describe, expect, it } from "vitest";
import { triangleTouchesRect } from "@/lib/screenRectHit";

const rect = { left: 10, top: 10, right: 20, bottom: 20 };

describe("a triangle on the screen against a selection box", () => {
  it("is hit when one of its corners lies in the box", () => {
    expect(triangleTouchesRect(15, 15, 40, 40, 40, 0, rect)).toBe(true);
  });

  it("is hit when only an edge passes through the box", () => {
    expect(triangleTouchesRect(0, 15, 30, 15, 15, 60, rect)).toBe(true);
  });

  it("is hit when the box lies wholly inside it", () => {
    expect(triangleTouchesRect(-100, -100, 200, -100, 15, 300, rect)).toBe(true);
  });

  it("is missed when the box lies beside it, even inside its bounding box", () => {
    // The triangle's bounding box covers the selection box; the triangle itself does not.
    expect(triangleTouchesRect(0, 0, 100, 0, 100, 100, { left: 5, top: 40, right: 20, bottom: 60 })).toBe(false);
  });

  it("is missed when it lies clear of the box", () => {
    expect(triangleTouchesRect(30, 30, 40, 30, 35, 40, rect)).toBe(false);
  });
});
