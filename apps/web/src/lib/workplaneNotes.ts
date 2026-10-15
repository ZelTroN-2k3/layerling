import { createLocalId } from "@/lib/localIds";
import type { WorkplaneNote, WorkplaneNoteAnchor, WorkplaneShape } from "@/types/layerling";

/**
 * So lang darf eine Notiz werden. Grosszuegig genug fuer ein paar Saetze und
 * knapp genug, dass niemand ein halbes Handbuch in ein Projekt legt, das damit
 * bei jedem Sichern durch die Leitung geht.
 */
export const NOTE_TEXT_LIMIT = 2000;

/** Mehr Notizen als das nimmt ein Entwurf nicht an. */
export const NOTE_COUNT_LIMIT = 200;

export function createNoteId() {
  return createLocalId("note");
}

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeAnchor(value: unknown): WorkplaneNoteAnchor | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<WorkplaneNoteAnchor>;
  if (typeof raw.shapeId !== "string" || !raw.shapeId) return undefined;
  const normalized = raw.normalized;
  if (!Array.isArray(normalized) || normalized.length !== 3) return undefined;
  const numbers = normalized.map((entry) => finiteNumber(entry));
  return { shapeId: raw.shapeId, normalized: [numbers[0], numbers[1], numbers[2]] };
}

/**
 * Eine Notiz auf ein Mass bringen, das in ein Projekt darf. Was nicht zu retten
 * ist - kein Text, keine Kennung - faellt weg, alles andere wird zurechtgerueckt
 * statt abgewiesen: Eine Notiz ist Beiwerk und soll nie ein Paket unlesbar
 * machen.
 */
export function normalizeNote(value: unknown): WorkplaneNote | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<WorkplaneNote>;
  const text = typeof raw.text === "string" ? raw.text.slice(0, NOTE_TEXT_LIMIT) : "";
  const id = typeof raw.id === "string" && raw.id ? raw.id : createNoteId();
  const note: WorkplaneNote = {
    id,
    text,
    x: finiteNumber(raw.x),
    y: finiteNumber(raw.y),
    z: finiteNumber(raw.z),
  };
  if (raw.kind === "point") {
    // A reference point is a bare mark: no text, no anchor; open, it shows its coordinates.
    const point: WorkplaneNote = { id, text: "", x: note.x, y: note.y, z: note.z, kind: "point" };
    if (raw.collapsed) point.collapsed = true;
    return point;
  }
  const anchor = normalizeAnchor(raw.anchor);
  if (anchor) note.anchor = anchor;
  if (raw.collapsed) note.collapsed = true;
  return note;
}

export function normalizeNotes(value: unknown): WorkplaneNote[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const notes: WorkplaneNote[] = [];
  for (const entry of value) {
    const note = normalizeNote(entry);
    if (!note || seen.has(note.id)) continue;
    seen.add(note.id);
    notes.push(note);
    if (notes.length >= NOTE_COUNT_LIMIT) break;
  }
  return notes;
}

/**
 * Eine Notiz, deren Koerper verschwunden ist, **bleibt stehen** - sie loest sich
 * nur von ihm und behaelt die Stelle, an der sie zuletzt stand. Das ist die
 * verzeihende Seite: Beim Gruppieren zweier Teile wandert die Notiz nicht mit in
 * den neuen Koerper, aber sie geht auch nicht verloren. Verschwaende sie mit dem
 * Koerper, waere jedes Gruppieren ein stiller Verlust.
 */
export function detachNotesFromMissingShapes(notes: WorkplaneNote[], shapes: WorkplaneShape[]): WorkplaneNote[] {
  if (notes.every((note) => !note.anchor)) return notes;
  const ids = new Set(shapes.map((shape) => shape.id));
  let changed = false;
  const next = notes.map((note) => {
    if (!note.anchor || ids.has(note.anchor.shapeId)) return note;
    changed = true;
    const { anchor: _anchor, ...free } = note;
    return free;
  });
  return changed ? next : notes;
}

/**
 * Der Fingerabdruck der Notizen. Er geht in den Fingerabdruck des Standes ein,
 * damit zwei Staende, die sich nur in einer Notiz unterscheiden, nicht fuer
 * denselben gehalten werden - das Paketformat legt gleiche Staende zusammen,
 * und eine Notiz waere sonst beim Sichern weg.
 */
export function notesSignature(notes: WorkplaneNote[]) {
  if (notes.length === 0) return "";
  return notes
    .map((note) => [
      note.id,
      note.text,
      note.anchor ? `${note.anchor.shapeId}@${note.anchor.normalized.map((value) => value.toFixed(4)).join(",")}` : "free",
      `${note.x.toFixed(3)},${note.y.toFixed(3)},${note.z.toFixed(3)}`,
      note.collapsed ? "c" : "",
      note.kind === "point" ? "point" : "",
    ].join("|"))
    .join("\n");
}

/** The reference points among the notes, and the notes proper. */
export function isReferencePoint(note: WorkplaneNote) {
  return note.kind === "point";
}

export function referencePoints(notes: readonly WorkplaneNote[]) {
  return notes.filter(isReferencePoint);
}
