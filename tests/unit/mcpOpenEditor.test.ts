import { describe, expect, it } from "vitest";
// @ts-expect-error a plain .mjs module
import { editorUrl, isLocalBridgeUrl, openCommand, openEditorAndWait } from "../../scripts/layerling-mcp-open.mjs";
// @ts-expect-error a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";

describe("opening an editor for the AI client (#250)", () => {
  it("knows which bridge addresses are on this computer", () => {
    expect(isLocalBridgeUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalBridgeUrl("http://localhost:3020")).toBe(true);
    expect(isLocalBridgeUrl("http://[::1]:3000")).toBe(true);
    expect(isLocalBridgeUrl("http://layerling.localhost:3000")).toBe(true);
    // A copy on a NAS or server: the browser would open here, not there.
    expect(isLocalBridgeUrl("http://192.168.1.20:3000")).toBe(false);
    expect(isLocalBridgeUrl("https://layerling.example.com")).toBe(false);
    expect(isLocalBridgeUrl("not a url")).toBe(false);
  });

  it("opens the editor page, with the browser command of each platform", () => {
    expect(editorUrl("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000/?editor=1");
    expect(openCommand("win32", "http://x/?editor=1")).toEqual({ command: "cmd.exe", args: ["/c", "start", "", "http://x/?editor=1"] });
    expect(openCommand("darwin", "http://x/?editor=1")).toEqual({ command: "open", args: ["http://x/?editor=1"] });
    expect(openCommand("linux", "http://x/?editor=1")).toEqual({ command: "xdg-open", args: ["http://x/?editor=1"] });
  });

  it("opens the browser and returns the editor that connects, not one that was there before", async () => {
    const editors: Array<{ editorNumber: number }> = [{ editorNumber: 7 }];
    const opened: string[] = [];
    let polls = 0;
    const result = await openEditorAndWait({
      baseUrl: "http://127.0.0.1:3000",
      listEditors: async () => {
        polls += 1;
        // The new tab shows up on the third look.
        if (polls === 3) editors.push({ editorNumber: 8 });
        return { editors: [...editors] };
      },
      open: (url: string) => opened.push(url),
      wait: async () => {},
    });
    expect(opened).toEqual(["http://127.0.0.1:3000/?editor=1"]);
    expect(result.editor.editorNumber).toBe(8);
    expect(result.editors).toHaveLength(2);
  });

  it("gives up with a message when no editor connects, and does not try for a copy on a server", async () => {
    await expect(openEditorAndWait({ baseUrl: "http://127.0.0.1:3000", listEditors: async () => ({ editors: [] }), open: () => {}, wait: async () => {}, timeoutMs: 3000, stepMs: 1000 }))
      .rejects.toThrow(/did not connect within 3 s/);
    const opened: string[] = [];
    await expect(openEditorAndWait({ baseUrl: "http://nas.lan:3000", listEditors: async () => ({ editors: [] }), open: (url: string) => opened.push(url), wait: async () => {} }))
      .rejects.toThrow(/not on this computer/);
    expect(opened).toEqual([]);
  });

  it("is a tool of the MCP server", () => {
    expect((tools as Array<{ name: string }>).some((tool) => tool.name === "layerling_open_editor")).toBe(true);
  });
});
