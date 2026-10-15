import { describe, expect, it } from "vitest";
import { editorHistoryEntry, hydrateEditorHistoryState, notesForHistoryIndex, projectSceneFingerprint } from "@/lib/editorHistory";
import { detachNotesFromMissingShapes, normalizeNotes, NOTE_COUNT_LIMIT, NOTE_TEXT_LIMIT } from "@/lib/workplaneNotes";
import type { WorkplaneNote, WorkplaneShape } from "@/types/layerling";

/*
 * Eine Notiz ist Beiwerk - sie traegt keine Geometrie und wird nicht gedruckt.
 * Genau deshalb darf sie nie ein Projekt kosten: Was nicht zu retten ist, faellt
 * weg, alles andere wird zurechtgerueckt. Und weil sie im Verlauf mitreist,
 * haengt an ihrem Fingerabdruck, ob ein Stand als eigener Stand gilt.
 */

function box(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "box-1",
    name: "Box",
    kind: "box",
    color: "#ffffff",
    x: 0,
    z: 0,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 20,
    rotation: 0,
    ...overrides,
  };
}

function note(overrides: Partial<WorkplaneNote> = {}): WorkplaneNote {
  return { id: "note-1", text: "Hier 4,2 aufreiben", x: 5, y: 0, z: 7, ...overrides };
}

describe("normalizing a note", () => {
  it("keeps what a note is made of", () => {
    const anchor = { shapeId: "box-1", normalized: [0.5, 0.25, -0.5] as [number, number, number] };
    expect(normalizeNotes([note({ anchor, collapsed: true })])).toEqual([
      { id: "note-1", text: "Hier 4,2 aufreiben", x: 5, y: 0, z: 7, anchor, collapsed: true },
    ]);
  });

  it("drops an anchor that names no shape instead of refusing the note", () => {
    const restored = normalizeNotes([note({ anchor: { shapeId: "", normalized: [0, 0, 0] } })]);
    expect(restored).toHaveLength(1);
    expect(restored[0].anchor).toBeUndefined();
  });

  it("cuts an overlong text and repairs numbers that are not numbers", () => {
    const [restored] = normalizeNotes([{ id: "note-2", text: "x".repeat(NOTE_TEXT_LIMIT + 500), x: Number.NaN, y: 0, z: 3 }]);
    expect(restored.text).toHaveLength(NOTE_TEXT_LIMIT);
    expect(restored.x).toBe(0);
    expect(restored.z).toBe(3);
  });

  it("refuses duplicates and stops at the limit", () => {
    expect(normalizeNotes([note(), note()])).toHaveLength(1);
    const many = Array.from({ length: NOTE_COUNT_LIMIT + 20 }, (_unused, index) => note({ id: `note-${index}` }));
    expect(normalizeNotes(many)).toHaveLength(NOTE_COUNT_LIMIT);
  });
});

describe("a note whose shape is gone", () => {
  it("stays where it was and only lets go of the shape", () => {
    const pinned = note({ anchor: { shapeId: "box-9", normalized: [0, 0, 0] } });
    const [detached] = detachNotesFromMissingShapes([pinned], [box()]);
    expect(detached.anchor).toBeUndefined();
    expect([detached.x, detached.z]).toEqual([5, 7]);
  });

  it("is left alone while its shape is there", () => {
    const notes = [note({ anchor: { shapeId: "box-1", normalized: [0, 0, 0] } })];
    expect(detachNotesFromMissingShapes(notes, [box()])).toBe(notes);
  });
});

describe("notes in the undo history", () => {
  it("makes a state of its own out of a scene that only gained a note", () => {
    const withoutNote = editorHistoryEntry([box()], []);
    const withNote = editorHistoryEntry([box()], [], [note()]);
    // Ohne das legt das Paketformat beide Staende zusammen - und die Notiz waere
    // beim naechsten Oeffnen weg.
    expect(withNote.fingerprint).not.toBe(withoutNote.fingerprint);
  });

  it("tells two different notes apart", () => {
    const first = editorHistoryEntry([box()], [], [note({ text: "M4" })]);
    const second = editorHistoryEntry([box()], [], [note({ text: "M5" })]);
    expect(first.fingerprint).not.toBe(second.fingerprint);
  });

  it("carries the notes of the state the history points at", () => {
    const entries = [editorHistoryEntry([box()], []), editorHistoryEntry([box()], [], [note()])];
    expect(notesForHistoryIndex(entries, 1)).toHaveLength(1);
    expect(notesForHistoryIndex(entries, 0)).toEqual([]);
  });

  it("keeps a stored history when the notes are handed back with it", () => {
    const entries = [editorHistoryEntry([box()], [], [note()])];
    const restored = hydrateEditorHistoryState([box()], entries, 0, "unlimited", [note()]);
    expect(restored.entries).toHaveLength(1);
    expect(restored.entries[0].notes).toHaveLength(1);
  });

  it("throws the history away when the notes do not match the state", () => {
    // Das ist der Sinn der Pruefung: Ein Verlauf, der nicht zu den Koerpern auf
    // dem Tisch gehoert, ist schlimmer als gar keiner.
    const entries = [editorHistoryEntry([box()], [], [note()])];
    const restored = hydrateEditorHistoryState([box()], entries, 0);
    expect(restored.entries[0].notes).toBeUndefined();
  });
});

describe("the fingerprint that decides whether to save", () => {
  it("changes when a note is written, although no shape moved", () => {
    const before = projectSceneFingerprint([box()], []);
    const after = projectSceneFingerprint([box()], [note()]);
    expect(after).not.toBe(before);
  });
});
