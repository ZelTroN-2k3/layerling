import { describe, expect, it } from "vitest";
// @ts-expect-error the tool list is a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";

type Tool = { name: string; description: string; inputSchema: { properties: Record<string, { type?: string; minimum?: number; maximum?: number; items?: { properties: Record<string, { enum?: string[] }> } }>; required?: string[] } };
const tool = (tools as Tool[]).find((entry) => entry.name === "layerling_layer_icon")!;

describe("layerling_layer_icon", () => {
  it("is in the tool list with the arguments of the icon tag", () => {
    expect(tool).toBeDefined();
    expect(Object.keys(tool.inputSchema.properties)).toEqual(expect.arrayContaining(["svg", "name", "id", "width", "layers", "count"]));
    // Either an svg or an id: neither is required on its own.
    expect(tool.inputSchema.required ?? []).toEqual([]);
  });

  it("takes the card's width and count limits", () => {
    expect(tool.inputSchema.properties.width).toMatchObject({ minimum: 2, maximum: 250 });
    expect(tool.inputSchema.properties.count).toMatchObject({ minimum: 1, maximum: 100 });
  });

  it("has layers like layerling_layer_text, without the letter edge", () => {
    const layer = tool.inputSchema.properties.layers.items!.properties;
    expect(layer.join.enum).toEqual(["round", "bevel", "miter"]);
    expect(Object.keys(layer)).not.toContain("edge");
  });
});
