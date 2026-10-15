import { describe, expect, it } from "vitest";
import { selectWholeValue } from "@/lib/numberField";

/*
 * Klein, aber der Unterschied zwischen benutzbar und nicht: Auf einem Tablet
 * hat die Dezimaltastatur keine Pfeiltasten, mit denen sich der Schreibzeiger
 * setzen liesse. Ohne markierten Wert muesste man aus "20.00" Zeichen fuer
 * Zeichen eine "35" loeschen.
 */

function field(value: string) {
  let selected = 0;
  return {
    value,
    select: () => {
      selected += 1;
    },
    get selectedTimes() {
      return selected;
    },
  };
}

describe("a number field that is jumped into", () => {
  it("offers its whole value for overwriting", () => {
    const input = field("20.00");
    expect(selectWholeValue(input)).toBe(true);
    expect(input.selectedTimes).toBe(1);
  });

  it("leaves an empty field alone", () => {
    // Dort gibt es nichts zu markieren, und der Schreibzeiger steht ohnehin
    // schon an der einzigen Stelle, die es gibt.
    const input = field("");
    expect(selectWholeValue(input)).toBe(false);
    expect(input.selectedTimes).toBe(0);
  });

  it("does not stumble over a field that is not there", () => {
    expect(selectWholeValue(null)).toBe(false);
    expect(selectWholeValue(undefined)).toBe(false);
  });
});
