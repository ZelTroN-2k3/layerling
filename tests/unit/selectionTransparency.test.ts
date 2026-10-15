import { describe, expect, it } from "vitest";
import { nextSelectionTransparency } from "@/lib/selectionTransparency";

describe("T key: transparency of the selection", () => {
  it("makes solid parts see-through", () => {
    expect(nextSelectionTransparency([{}, { transparent: false }])).toBe(true);
  });

  it("makes see-through parts opaque", () => {
    expect(nextSelectionTransparency([{ transparent: true }, { transparent: true }])).toBe(false);
  });

  it("goes opaque first when the selection is mixed, then see-through", () => {
    expect(nextSelectionTransparency([{ transparent: true }, {}])).toBe(false);
    expect(nextSelectionTransparency([{}, {}])).toBe(true);
  });

  it("leaves holes and locked parts out of the decision", () => {
    expect(nextSelectionTransparency([{ transparent: true, locked: true }, {}])).toBe(true);
    expect(nextSelectionTransparency([{ hole: true }, { transparent: true }])).toBe(false);
  });

  it("does nothing when no part can change", () => {
    expect(nextSelectionTransparency([{ hole: true }, { locked: true }])).toBeNull();
    expect(nextSelectionTransparency([])).toBeNull();
  });
});
