import { describe, expect, it } from "vitest";
import { layerlingToZUp, zUpToLayerling } from "@/lib/meshCoordinates";

describe("mesh coordinate conventions", () => {
  it("maps slicer Z-up coordinates to Layerling Y-up and back", () => {
    const slicerPoint: [number, number, number] = [12, 34, 56];
    const layerlingPoint = zUpToLayerling(slicerPoint);

    expect(layerlingPoint).toEqual([12, 56, -34]);
    expect(layerlingToZUp(layerlingPoint)).toEqual(slicerPoint);
  });
});
