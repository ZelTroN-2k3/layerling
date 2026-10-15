import { describe, expect, it } from "vitest";
import { duplicateBaseName, duplicateName } from "@/lib/duplicateName";
import { MESSAGES_DE } from "@/lib/messages.de";
import { MESSAGES_EN } from "@/lib/messages.en";

/*
 * Der Name einer Kopie kommt aus dem Sprachkatalog, deshalb pruefen die Tests
 * gegen die echten Muster beider Sprachen und nicht gegen erfundene. Dass ein
 * Name wie "Halter (Kopie) (Kopie) (Kopie)" nie entsteht, ist der eigentliche
 * Zweck der Datei.
 */
const EN = { copy: MESSAGES_EN["dashboard.copyOf"], numbered: MESSAGES_EN["dashboard.copyOfNumbered"] };
const DE = { copy: MESSAGES_DE["dashboard.copyOf"], numbered: MESSAGES_DE["dashboard.copyOfNumbered"] };

describe("the name of a copy", () => {
  it("adds the copy suffix when nothing is in the way", () => {
    expect(duplicateName("Halter", [], EN)).toBe("Halter (copy)");
    expect(duplicateName("Halter", [], DE)).toBe("Halter (Kopie)");
  });

  it("counts up instead of piling suffixes on a copy of a copy", () => {
    const taken = ["Halter", "Halter (copy)"];
    expect(duplicateName("Halter (copy)", taken, EN)).toBe("Halter (copy 2)");
    expect(duplicateName("Halter (copy 2)", [...taken, "Halter (copy 2)"], EN)).toBe("Halter (copy 3)");
  });

  it("finds the next free number even with gaps in the row", () => {
    expect(duplicateName("Halter", ["Halter (copy)", "Halter (copy 3)"], EN)).toBe("Halter (copy 2)");
  });

  it("reads a taken name the way both stores compare them - case does not matter", () => {
    expect(duplicateName("Halter", ["halter (COPY)"], EN)).toBe("Halter (copy 2)");
  });

  it("only strips a suffix of its own language", () => {
    // Der deutsche Zusatz ist fuer den englischen Katalog kein Zusatz, sondern
    // Teil des Namens - sonst wuerde eine Sprachumstellung Namen zerschneiden.
    expect(duplicateBaseName("Halter (Kopie)", EN)).toBe("Halter (Kopie)");
    expect(duplicateBaseName("Halter (Kopie)", DE)).toBe("Halter");
  });

  it("keeps the suffix and shortens the name when the limit is tight", () => {
    const long = "H".repeat(115);
    const name = duplicateName(long, [], EN, 115);
    expect(name).toHaveLength(115);
    expect(name.endsWith(" (copy)")).toBe(true);
  });

  it("stays inside the limit for the numbered copies too", () => {
    const long = "H".repeat(115);
    const first = duplicateName(long, [], EN, 115);
    const second = duplicateName(long, [first], EN, 115);
    expect(second.length).toBeLessThanOrEqual(115);
    expect(second).not.toBe(first);
  });

  it("always returns a free name, however crowded the folder is", () => {
    const taken = ["Halter (copy)", ...Array.from({ length: 40 }, (_unused, index) => `Halter (copy ${index + 2})`)];
    const name = duplicateName("Halter", taken, EN);
    expect(taken).not.toContain(name);
    expect(name).toBe("Halter (copy 42)");
  });
});
