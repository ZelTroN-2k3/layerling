import { describe, expect, it } from "vitest";
import { rememberCommand, searchCommands, searchWords, type SearchableCommand } from "@/lib/commandSearch";

type Cmd = SearchableCommand & { id: string };

const COMMANDS: Cmd[] = [
  { id: "copy", label: "Kopieren", group: "Zwischenablage", keywords: ["copy"] },
  { id: "fillet", label: "Verrunden", group: "Anpassen", keywords: ["fillet", "abrunden", "radius"], enabled: false },
  { id: "chamfer", label: "Fase", group: "Anpassen", keywords: ["chamfer", "abschraegen"] },
  { id: "hollow", label: "Aushöhlen", group: "Anpassen", keywords: ["hollow", "shell"] },
  { id: "cylinder", label: "Form hinzufügen: Zylinder", group: "Formen", keywords: ["cylinder", "rohr"] },
  { id: "cone", label: "Form hinzufügen: Kegel", group: "Formen" },
  { id: "measure", label: "Lineal", group: "Messen" },
];

const ids = (query: string) => searchCommands(COMMANDS, query).map((command) => command.id);

describe("searchCommands", () => {
  it("returns everything in toolbar order for an empty query", () => {
    expect(ids("")).toEqual(COMMANDS.map((command) => command.id));
    expect(ids("   ")).toEqual(COMMANDS.map((command) => command.id));
  });

  it("finds by label, keyword in the other language, and group", () => {
    expect(ids("kopier")).toEqual(["copy"]);
    expect(ids("shell")).toEqual(["hollow"]);
    expect(ids("messen")).toEqual(["measure"]);
    expect(ids("cylinder")).toEqual(["cylinder"]);
  });

  it("does not care about case, umlauts or their spelled-out form", () => {
    expect(ids("AUSHÖHLEN")).toEqual(["hollow"]);
    expect(ids("aushoehlen")).toEqual(["hollow"]);
    expect(ids("aushohlen")).toEqual(["hollow"]);
    expect(ids("zylinder")).toEqual(["cylinder"]);
    expect(ids("verrunden")).toEqual(["fillet"]);
    expect(ids("hinzufuegen kegel")).toEqual(["cone"]);
  });

  it("needs every word of the query to match", () => {
    expect(ids("form kegel")).toEqual(["cone"]);
    expect(ids("form lineal")).toEqual([]);
  });

  it("ranks the whole word above a word start, and that above a hit inside a word", () => {
    const ranked = searchCommands(
      [
        { id: "inside", label: "Verfasen", group: "x" },
        { id: "start", label: "Fasenwerkzeug", group: "x" },
        { id: "whole", label: "Fase", group: "x" },
      ],
      "fase",
    ).map((command) => command.id);
    expect(ranked).toEqual(["whole", "start", "inside"]);
  });

  it("ranks a hit in the label above one in a keyword, and that above the group", () => {
    const ranked = searchCommands(
      [
        { id: "group", label: "Nichts", group: "Spiegeln" },
        { id: "keyword", label: "Anderes", group: "x", keywords: ["spiegeln"] },
        { id: "label", label: "Spiegeln", group: "x" },
      ],
      "spiegeln",
    ).map((command) => command.id);
    expect(ranked).toEqual(["label", "keyword", "group"]);
  });

  it("lists a command that cannot run after an equal hit that can", () => {
    expect(ids("anpassen")).toEqual(["chamfer", "hollow", "fillet"]);
  });

  it("remembers the newest command first, once, and only a few", () => {
    expect(rememberCommand([], "copy")).toEqual(["copy"]);
    expect(rememberCommand(["copy", "paste"], "paste")).toEqual(["paste", "copy"]);
    expect(rememberCommand(["a", "b", "c", "d", "e"], "f")).toEqual(["f", "a", "b", "c", "d"]);
    expect(rememberCommand(["a", "b"], "c", 2)).toEqual(["c", "a"]);
  });

  it("splits words in both spellings", () => {
    expect(searchWords("Aushöhlen")).toEqual(expect.arrayContaining(["aushoehlen", "aushohlen"]));
  });
});
