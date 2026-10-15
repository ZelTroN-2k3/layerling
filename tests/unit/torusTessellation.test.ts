import { describe, expect, it } from "vitest";
import { cadModifierPrimitiveForAnalyticShape } from "@/lib/cadBakeMetadata";
import { TORUS_DEFAULT_RING_SIDES, TORUS_DEFAULT_TUBE_STEPS, torusTessellation } from "@/lib/torusTessellation";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The torus has a ring and a tube, and both are adjustable now (#272): "Sides" go around the
 * ring, "Steps" around the tube. Without a value each follows the size - never coarser than the
 * fixed numbers the torus used to carry, so a big one shows no facets.
 */

function torusShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "torus-shape",
    name: "Torus",
    kind: "torus",
    color: "#0098c7",
    x: 0,
    z: 0,
    elevation: 0,
    size: 34,
    width: 34,
    depth: 34,
    height: 8,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

describe("torus tessellation", () => {
  it("never draws a torus coarser than the old fixed numbers", () => {
    const small = torusTessellation({}, 10, 10, 3);
    expect(small.ringSides).toBeGreaterThanOrEqual(TORUS_DEFAULT_RING_SIDES);
    expect(small.tubeSteps).toBeGreaterThanOrEqual(TORUS_DEFAULT_TUBE_STEPS);
  });

  it("follows the size when nothing is set", () => {
    const small = torusTessellation({}, 34, 34, 8);
    const big = torusTessellation({}, 200, 200, 60);
    expect(big.ringSides).toBeGreaterThan(small.ringSides);
    expect(big.tubeSteps).toBeGreaterThan(small.tubeSteps);
  });

  it("takes the set numbers, rounded and kept within the limits", () => {
    expect(torusTessellation({ sides: 47.6, steps: 12 }, 200, 200, 60)).toEqual({ ringSides: 48, tubeSteps: 12 });
    expect(torusTessellation({ sides: 1, steps: 1 }, 34, 34, 8)).toEqual({ ringSides: 12, tubeSteps: 6 });
    expect(torusTessellation({ sides: 99999, steps: 99999 }, 34, 34, 8)).toEqual({ ringSides: 512, tubeSteps: 256 });
  });

  it("treats a missing or broken value as not set", () => {
    const followed = torusTessellation({}, 34, 34, 8);
    expect(torusTessellation({ sides: null, steps: Number.NaN }, 34, 34, 8)).toEqual(followed);
  });

  it("builds an exact torus unless the set numbers are meant faceted", () => {
    expect(cadModifierPrimitiveForAnalyticShape(torusShape())?.kind).toBe("torus");
    expect(cadModifierPrimitiveForAnalyticShape(torusShape({ sides: 144, steps: 36 }))?.kind).toBe("torus");
    expect(cadModifierPrimitiveForAnalyticShape(torusShape({ sides: 12 }))).toBeNull();
    expect(cadModifierPrimitiveForAnalyticShape(torusShape({ steps: 6 }))).toBeNull();
  });
});
