import { describe, expect, it } from "vitest";
import { computeOriginAxisDistance, createOriginDimensionOverlay } from "@/lib/originDimensionLines";

describe("origin dimension lines", () => {
  const project = ({ x, z }: { x: number; y: number; z: number }) => ({ x: 400 + x * 4, y: 300 + z * 4 });

  describe("computeOriginAxisDistance", () => {
    it("returns the near-edge distance when the shape sits entirely on the positive side", () => {
      expect(computeOriginAxisDistance(20, 5, 0.005)).toBe(15);
    });

    it("returns the near-edge distance when the shape sits entirely on the negative side", () => {
      expect(computeOriginAxisDistance(-20, 5, 0.005)).toBe(-15);
    });

    it("returns null when the shape straddles the origin on this axis", () => {
      expect(computeOriginAxisDistance(2, 5, 0.005)).toBeNull();
    });

    it("treats a shape flush with the origin as zero, not a straddle", () => {
      expect(computeOriginAxisDistance(5, 5, 0.005)).toBe(0);
    });
  });

  describe("createOriginDimensionOverlay", () => {
    it("shows a single dimension line for a shape offset only along X", () => {
      const overlay = createOriginDimensionOverlay({
        originWorld: { x: 0, y: 0, z: 0 },
        xEndpointWorld: { x: 15, y: 0, z: 0 },
        zEndpointWorld: null,
        distanceX: 15,
        distanceZ: null,
        accuracy: 2,
        width: 800,
        height: 600,
        project,
      });

      expect(overlay?.lines).toHaveLength(1);
      expect(overlay?.lines[0]).toMatchObject({ axis: "x", label: "15.00", x2: 460, y2: 300 });
    });

    it("shows both axes together when neither straddles the origin", () => {
      const overlay = createOriginDimensionOverlay({
        originWorld: { x: 0, y: 0, z: 0 },
        xEndpointWorld: { x: 15, y: 0, z: 0 },
        zEndpointWorld: { x: 0, y: 0, z: -8 },
        distanceX: 15,
        distanceZ: -8,
        accuracy: 2,
        width: 800,
        height: 600,
        project,
      });

      expect(overlay?.lines.map((line) => [line.axis, line.label])).toEqual([
        ["x", "15.00"],
        // Inside z -8 lies behind the origin: as Y, which counts towards the back, that is +8 (#182).
        ["z", "8.00"],
      ]);
    });

    it("shows an exact-zero distance instead of hiding it, unlike the move-dimension overlay", () => {
      const overlay = createOriginDimensionOverlay({
        originWorld: { x: 0, y: 0, z: 0 },
        xEndpointWorld: { x: 0, y: 0, z: 0 },
        zEndpointWorld: null,
        distanceX: 0,
        distanceZ: null,
        accuracy: 2,
        width: 800,
        height: 600,
        project,
      });

      expect(overlay?.lines).toHaveLength(1);
      expect(overlay?.lines[0]).toMatchObject({ axis: "x", label: "0.00" });
    });

    it("omits an axis whose endpoint is null (the shape straddles the origin there)", () => {
      const overlay = createOriginDimensionOverlay({
        originWorld: { x: 0, y: 0, z: 0 },
        xEndpointWorld: null,
        zEndpointWorld: { x: 0, y: 0, z: -8 },
        distanceX: null,
        distanceZ: -8,
        accuracy: 2,
        width: 800,
        height: 600,
        project,
      });

      expect(overlay?.lines).toHaveLength(1);
      expect(overlay?.lines[0].axis).toBe("z");
    });

    it("returns null when both axes straddle the origin", () => {
      const overlay = createOriginDimensionOverlay({
        originWorld: { x: 0, y: 0, z: 0 },
        xEndpointWorld: null,
        zEndpointWorld: null,
        distanceX: null,
        distanceZ: null,
        accuracy: 2,
        width: 800,
        height: 600,
        project,
      });

      expect(overlay).toBeNull();
    });
  });
});
