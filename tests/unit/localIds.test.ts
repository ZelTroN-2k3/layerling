import { describe, expect, it } from "vitest";
import { derivedLocalId } from "@/lib/localIds";

describe("derivedLocalId", () => {
  it("keeps the id from growing when a group is opened and closed again and again", () => {
    let id = "box-1234";
    for (let round = 0; round < 5; round += 1) {
      id = derivedLocalId(id, "group-child");
      id = derivedLocalId(id, "ungroup");
    }
    expect(id.startsWith("box-1234-ungroup-")).toBe(true);
    expect(id.split("-ungroup-")).toHaveLength(2);
    expect(id).not.toContain("group-child");
  });

  it("hands out a new id every time", () => {
    expect(derivedLocalId("box-1", "ungroup")).not.toBe(derivedLocalId("box-1", "ungroup"));
  });
});
