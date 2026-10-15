import { describe, expect, it } from "vitest";
import { screenAlignedNudge } from "@/lib/keyboardNudge";

const plate = { xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } };
const step = 1;
// Arrow keys: right (+x step), left, up (-z step, away), down.
const keys = { right: [step, 0], left: [-step, 0], up: [0, -step], down: [0, step] } as const;

function move(screen: { right: { x: number; y: number; z: number }; away: { x: number; y: number; z: number } } | undefined, key: keyof typeof keys) {
  const [dx, dz] = keys[key];
  const { xStep, zStep } = screenAlignedNudge(plate, dx, dz, screen);
  return { x: xStep, z: zStep };
}

describe("arrow keys follow the view", () => {
  it("keeps the plane's axes without a view and seen from the front", () => {
    expect(move(undefined, "right")).toEqual({ x: 1, z: 0 });
    const front = { right: { x: 1, y: 0, z: 0 }, away: { x: 0, y: 0.3, z: -1 } };
    expect(move(front, "right")).toEqual({ x: 1, z: 0 });
    expect(move(front, "up")).toEqual({ x: 0, z: -1 });
    expect(move(front, "down")).toEqual({ x: 0, z: 1 });
  });

  it("swaps and turns the axes when the view looks from the right side", () => {
    // Looking towards -x: screen right is -z, away is -x.
    const fromRight = { right: { x: 0, y: 0, z: -1 }, away: { x: -1, y: 0.2, z: 0 } };
    expect(move(fromRight, "right")).toEqual({ x: 0, z: -1 });
    expect(move(fromRight, "up")).toEqual({ x: -1, z: 0 });
    expect(move(fromRight, "left")).toEqual({ x: 0, z: 1 });
  });

  it("works from behind and from above with the view turned", () => {
    const fromBehind = { right: { x: -1, y: 0, z: 0 }, away: { x: 0, y: 0.2, z: 1 } };
    expect(move(fromBehind, "right")).toEqual({ x: -1, z: 0 });
    expect(move(fromBehind, "up")).toEqual({ x: 0, z: 1 });
    // From straight above, turned a quarter: screen up is +x.
    const aboveTurned = { right: { x: 0, y: 0, z: 1 }, away: { x: 1, y: -1, z: 0 } };
    expect(move(aboveTurned, "up")).toEqual({ x: 1, z: 0 });
    expect(move(aboveTurned, "right")).toEqual({ x: 0, z: 1 });
  });
});
