import { describe, expect, it } from "vitest";
import { canEditGroupAtLevel, openGroupLevelsStillOpen, trackOpenGroupLevels, trackOpenGroupParts } from "@/lib/openGroupParts";

const shapes = (...ids: string[]) => ids.map((id) => ({ id }));

describe("the parts of an open group", () => {
  it("takes in what replaces a part, where that part stood", () => {
    // Ungrouping part c lays its two children loose under new ids.
    const parts = trackOpenGroupParts(["a", "b", "c", "d"], shapes("a", "b", "c", "d", "x"), shapes("a", "b", "d", "x", "c1", "c2"));
    expect(parts).toEqual(["a", "b", "c", "c1", "c2", "d"]);
  });

  it("follows a part through several replacements", () => {
    const start = ["a", "b", "c"];
    const ungrouped = trackOpenGroupParts(start, shapes("a", "b", "c"), shapes("a", "b", "c1", "c2"));
    const regrouped = trackOpenGroupParts(ungrouped, shapes("a", "b", "c1", "c2"), shapes("a", "b", "g"));
    expect(regrouped).toEqual(["a", "b", "c", "c1", "g", "c2"]);
  });

  it("keeps the group alive when every part is replaced at once", () => {
    expect(trackOpenGroupParts(["a", "b"], shapes("a", "b", "x"), shapes("x", "g"))).toEqual(["a", "g", "b"]);
  });

  it("takes in the result of combining a part with an outside object", () => {
    expect(trackOpenGroupParts(["a", "b"], shapes("a", "b", "x"), shapes("b", "cut"))).toEqual(["a", "cut", "b"]);
  });

  it("leaves new shapes, pastes and duplicates outside", () => {
    const parts = ["a", "b"];
    expect(trackOpenGroupParts(parts, shapes("a", "b"), shapes("a", "b", "copy"))).toBe(parts);
  });

  it("changes nothing when a part is only deleted", () => {
    const parts = ["a", "b"];
    expect(trackOpenGroupParts(parts, shapes("a", "b", "x"), shapes("a", "x"))).toBe(parts);
  });

  it("ignores replacements of objects outside the group", () => {
    const parts = ["a", "b"];
    expect(trackOpenGroupParts(parts, shapes("a", "b", "x", "y"), shapes("a", "b", "xy"))).toBe(parts);
  });

  it("keeps the ids of replaced parts, so undo brings them back as parts", () => {
    const grouped = trackOpenGroupParts(["a", "b", "c"], shapes("a", "b", "c"), shapes("a", "bc"));
    expect(grouped).toEqual(["a", "b", "bc", "c"]);
    // Undo: b and c return, bc goes - nothing new to take in, and b and c are still parts.
    expect(trackOpenGroupParts(grouped, shapes("a", "bc"), shapes("a", "b", "c"))).toBe(grouped);
  });
});

describe("groups edited inside each other", () => {
  it("gives a replacement to the innermost level that lost a part", () => {
    // Outer level: a and the inner group g (open); inner level: c and d.
    const levels = [["a", "g"], ["c", "d"]];
    const tracked = trackOpenGroupLevels(levels, shapes("a", "c", "d"), shapes("a", "cd"));
    expect(tracked).toEqual([["a", "g"], ["c", "cd", "d"]]);
    expect(tracked[0]).toBe(levels[0]);
  });

  it("gives a replacement of an outer part to the outer level", () => {
    const levels = [["a", "b", "g"], ["c", "d"]];
    expect(trackOpenGroupLevels(levels, shapes("a", "b", "c", "d"), shapes("ab", "c", "d"))).toEqual([["a", "ab", "b", "g"], ["c", "d"]]);
  });

  it("does not hand an id that a level already has to another one", () => {
    // Undo of an outer grouping brings a and b back while the inner level is open.
    const levels = [["a", "ab", "b", "g"], ["c", "d"]];
    expect(trackOpenGroupLevels(levels, shapes("ab", "c", "d"), shapes("a", "b", "c", "d"))).toBe(levels);
  });

  it("changes nothing for new shapes", () => {
    const levels = [["a", "g"], ["c", "d"]];
    expect(trackOpenGroupLevels(levels, shapes("a", "c", "d"), shapes("a", "c", "d", "new"))).toBe(levels);
  });
});

describe("which levels stay open", () => {
  const level = (groupId: string, ...partIds: string[]) => ({ groupId, partIds });
  const present = (...ids: string[]) => new Set(ids);

  it("keeps every level while each still has parts", () => {
    expect(openGroupLevelsStillOpen([level("outer", "a", "inner"), level("inner", "c", "d")], present("a", "c", "d"))).toBe(2);
  });

  it("ends the inner level when undo brings its group back, and keeps the outer one", () => {
    expect(openGroupLevelsStillOpen([level("outer", "a", "inner"), level("inner", "c", "d")], present("a", "inner"))).toBe(1);
  });

  it("ends every level when undo brings the outer group back", () => {
    expect(openGroupLevelsStillOpen([level("outer", "a", "inner"), level("inner", "c", "d")], present("outer"))).toBe(0);
  });

  it("keeps an outer level whose only part left is the group open inside it", () => {
    expect(openGroupLevelsStillOpen([level("outer", "a", "inner"), level("inner", "c", "d")], present("c", "d"))).toBe(2);
  });

  it("ends a level with nothing left, and every level inside it", () => {
    expect(openGroupLevelsStillOpen([level("outer", "a", "inner"), level("inner", "c")], present("x"))).toBe(0);
  });

  it("ends only the inner level when only its parts are gone", () => {
    expect(openGroupLevelsStillOpen([level("outer", "a", "inner"), level("inner", "c")], present("a"))).toBe(1);
  });
});

describe("which groups can be edited", () => {
  it("allows any group when none is being edited", () => {
    expect(canEditGroupAtLevel([], "g")).toBe(true);
  });

  it("allows only parts of the innermost level", () => {
    const levels = [{ partIds: ["a", "g1"] }, { partIds: ["c", "g2"] }];
    expect(canEditGroupAtLevel(levels, "g2")).toBe(true);
    expect(canEditGroupAtLevel(levels, "g1")).toBe(false);
    expect(canEditGroupAtLevel(levels, "elsewhere")).toBe(false);
  });
});
