import { describe, expect, it } from "vitest";
import { constrainToAngle, sketchLineAngle, sketchPolarPoint, splitTypedLine } from "@/lib/sketchPolar";

describe("sketch lines by length and angle (#194)", () => {
  it("counts the angle counterclockwise from the right, with up on the screen as 90°", () => {
    expect(sketchLineAngle({ x: 0, z: 0 }, { x: 10, z: 0 })).toBe(0);
    expect(sketchLineAngle({ x: 0, z: 0 }, { x: 0, z: -10 })).toBe(90);
    expect(sketchLineAngle({ x: 0, z: 0 }, { x: -10, z: 0 })).toBe(180);
    expect(sketchLineAngle({ x: 0, z: 0 }, { x: 0, z: 10 })).toBe(270);
    expect(sketchLineAngle({ x: 5, z: 5 }, { x: 15, z: -5 })).toBe(45);
  });

  it("places a point by length and angle", () => {
    expect(sketchPolarPoint({ x: 10, z: 10 }, 50, 0)).toEqual({ x: 60, z: 10 });
    expect(sketchPolarPoint({ x: 0, z: 0 }, 20, 90)).toEqual({ x: 0, z: -20 });
    const slanted = sketchPolarPoint({ x: 0, z: 0 }, 50, 30);
    expect(slanted.x).toBeCloseTo(43.30127, 4);
    expect(slanted.z).toBeCloseTo(-25, 6);
    expect(Math.hypot(slanted.x, slanted.z)).toBeCloseTo(50, 5);
  });

  it("snaps Shift-drawn lines to 15° steps, horizontal and vertical included", () => {
    expect(constrainToAngle({ x: 0, z: 0 }, { x: 30, z: 2 })).toEqual({ x: 30, z: 0 });
    expect(constrainToAngle({ x: 0, z: 0 }, { x: 1, z: -40 })).toEqual({ x: 0, z: -40 });
    const near45 = constrainToAngle({ x: 0, z: 0 }, { x: 20, z: -21 });
    expect(sketchLineAngle({ x: 0, z: 0 }, near45)).toBe(45);
    const near30 = constrainToAngle({ x: 0, z: 0 }, { x: 40, z: -22 });
    expect(sketchLineAngle({ x: 0, z: 0 }, near30)).toBe(30);
  });

  it("rounds the snapped length to the grid step", () => {
    const point = constrainToAngle({ x: 0, z: 0 }, { x: 35.2, z: -20.7 }, 15, 1);
    expect(sketchLineAngle({ x: 0, z: 0 }, point)).toBe(30);
    expect(Math.hypot(point.x, point.z)).toBeCloseTo(41, 5);
  });

  it("splits a typed 50<30 into length and angle", () => {
    expect(splitTypedLine("50<30")).toEqual({ length: "50", angle: "30" });
    expect(splitTypedLine("12,5")).toEqual({ length: "12,5", angle: null });
    expect(splitTypedLine("40+10<-15")).toEqual({ length: "40+10", angle: "-15" });
  });
});
