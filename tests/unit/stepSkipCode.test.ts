import { describe, expect, it } from "vitest";
import { skipCodeFor, stepSourceForShape } from "@/lib/stepExport";
import type { WorkplaneShape } from "@/types/layerling";

const shape = (extra: Partial<WorkplaneShape>) => ({ id: "s", name: "S", kind: "box", x: 0, z: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0, ...extra }) as WorkplaneShape;

describe("why a body was left out of the STEP file (#184)", () => {
  it("names a twist, a mesh, a hole and a kernel failure", () => {
    expect(skipCodeFor(shape({ extrudeTwist: 45 }), "no exact B-Rep mapping")).toBe("twist");
    expect(skipCodeFor(shape({ kind: "mesh" }), "imported mesh has no B-Rep source; re-import as STEP to round-trip")).toBe("mesh");
    expect(skipCodeFor(shape({ hole: true }), "hole no exact B-Rep mapping; cut omitted")).toBe("hole");
    expect(skipCodeFor(shape({}), "hole subtraction failed; exported solid without holes")).toBe("holeCut");
    expect(skipCodeFor(shape({ extrudeTwist: 45 }), "exact body could not be built: x")).toBe("failed");
    expect(skipCodeFor(shape({ kind: "cylinder", width: 10, depth: 20 }), "elliptical base is not an exact OCCT primitive")).toBe("oval");
  });

  it("takes a twisted box in as its loft since #184, a plain one as a box", () => {
    expect(stepSourceForShape(shape({ extrudeTwist: 45 }))).toBe("profile");
    expect(stepSourceForShape(shape({}))).toBe("primitive");
  });
});
