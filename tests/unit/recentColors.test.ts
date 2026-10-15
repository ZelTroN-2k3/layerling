import { describe, expect, it } from "vitest";
import { RECENT_COLOR_LIMIT, rememberedColors } from "@/lib/recentColors";

describe("recently used colours", () => {
  it("puts the newest first, once, and keeps the last eight", () => {
    let colors: string[] = [];
    for (let index = 0; index < 10; index += 1) colors = rememberedColors(colors, `#00000${index}`);
    expect(colors).toHaveLength(RECENT_COLOR_LIMIT);
    expect(colors[0]).toBe("#000009");
    expect(rememberedColors(colors, "#000005")).toEqual(["#000005", ...colors.filter((color) => color !== "#000005")]);
  });

  it("writes colours one way and leaves out the palette and anything that is no colour", () => {
    expect(rememberedColors([], "123ABC")).toEqual(["#123abc"]);
    expect(rememberedColors(["#123abc"], "#D41721", ["#d41721"])).toEqual(["#123abc"]);
    expect(rememberedColors(["#123abc"], "red")).toEqual(["#123abc"]);
  });
});
