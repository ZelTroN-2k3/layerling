import { describe, expect, it } from "vitest";
import { groupedPartSizeScale } from "@/lib/groupScale";

const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as const;
// A bar turned 90° about x and 270° about z: its own height runs along the group's x, its width along z, its depth along y.
const onItsSide = [[0, 0, 1], [1, 0, 0], [0, 1, 0]] as const;

describe("group stretch on a turned part (#234)", () => {
  it("stretches an unturned part by the group's own stretch", () => {
    expect(groupedPartSizeScale(identity, [6, 2, 3])).toEqual({ width: 6, height: 2, depth: 3 });
  });

  it("stretches a part on its side along the axis its width, height and depth really lie on", () => {
    const scale = groupedPartSizeScale(onItsSide, [6.05, 1, 1]);
    expect(scale.height).toBeCloseTo(6.05);
    expect(scale.width).toBeCloseTo(1);
    expect(scale.depth).toBeCloseTo(1);
  });

  it("stretches a bar lying along the group's x so it grows to the length of the group", () => {
    // Bar of 22 x 18 x 20 on its side inside a bundle grouped 20 wide, resized to 121.
    const scale = groupedPartSizeScale(onItsSide, [121 / 20, 1, 1]);
    expect(20 * scale.height).toBeCloseTo(121);
    expect(22 * scale.width).toBeCloseTo(22);
  });
});
