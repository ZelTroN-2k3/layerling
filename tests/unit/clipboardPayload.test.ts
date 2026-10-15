import { describe, expect, it } from "vitest";
import { decodeClipboardPayload, encodeClipboardPayload, newestClipboard } from "@/lib/clipboardPayload";

describe("layerling clipboard", () => {
  it("carries the moment of the copy", () => {
    const text = encodeClipboardPayload('[{"name":"A"}]', 1234);
    expect(decodeClipboardPayload(text)).toEqual({ copiedAt: 1234, shapes: [{ name: "A" }] });
  });

  it("still reads copies from before the stamp, as the oldest", () => {
    expect(decodeClipboardPayload('[{"name":"alt"}]')).toEqual({ copiedAt: 0, shapes: [{ name: "alt" }] });
    expect(decodeClipboardPayload("irgendein Text")).toBeNull();
  });

  it("pastes the newest copy, not an older one left behind in another place", () => {
    const memory = { copiedAt: 300, shapes: ["grosses Netz"] };
    const staleLocal = { copiedAt: 100, shapes: ["kleiner Quader"] };
    const staleSystem = { copiedAt: 200, shapes: ["noch aelter"] };
    expect(newestClipboard([memory, staleLocal, staleSystem])?.shapes).toEqual(["grosses Netz"]);
    expect(newestClipboard([{ copiedAt: 50, shapes: ["hier"] }, { copiedAt: 90, shapes: ["anderer Tab"] }])?.shapes).toEqual(["anderer Tab"]);
    expect(newestClipboard([{ copiedAt: 900, shapes: [] }, null, staleLocal])?.shapes).toEqual(["kleiner Quader"]);
    expect(newestClipboard([null, undefined])).toBeNull();
  });
});
