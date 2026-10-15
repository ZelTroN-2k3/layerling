import { createLocalId } from "@/lib/localIds";
import { backupEntryNames, CUSTOM_SHAPES_BACKUP_FOLDER, CUSTOM_SHAPES_MANIFEST, unpackCustomShapes, type BackupEntry } from "@/lib/projectBackup";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Custom shapes: bodies someone saved to use again, shown on top of the shape
 * library (#109). Each one is a small .lyl package - the same format as a
 * design, so reading it back goes through the checks every design gets - and
 * lives in IndexedDB, not in local storage: an imported STL alone can be
 * larger than the few megabytes local storage holds for all designs together.
 *
 * Two stores: the light "meta" records (name, preview) are read whenever the
 * library opens, the packages only when a shape is inserted.
 */

export type MyShapeMeta = {
  id: string;
  name: string;
  createdAt: number;
  /** PNG data URL, drawn from the bodies when they were saved. */
  thumbnail: string;
  bodyCount: number;
  byteLength: number;
  /** What the bodies are, so loading the same backup twice keeps them once. */
  fingerprint?: string;
};

export type MyShapeBox = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

const DB_NAME = "layerling-my-shapes";
const DB_VERSION = 1;
const META_STORE = "meta";
const PACKAGE_STORE = "packages";
const CHANGE_CHANNEL = "layerling-my-shapes";
export const MY_SHAPE_NAME_MAX = 80;

/** A name to keep: trimmed, single-spaced, not empty, not endless. */
export function cleanMyShapeName(name: string, fallback: string) {
  const cleaned = name.replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, MY_SHAPE_NAME_MAX);
  return cleaned || fallback;
}

/** The name a file brings along: "Halter v2.lyl" becomes "Halter v2". */
export function myShapeNameFromFile(fileName: string, fallback: string) {
  return cleanMyShapeName(fileName.replace(/\.(lyl|skf)$/i, ""), fallback);
}

export function myShapesBackupFileName(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `layerling-custom-shapes-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.zip`;
}

/** Newest last, so a fresh save shows up at the end of the row, where the eye expects it. */
export function sortMyShapes(shapes: MyShapeMeta[]) {
  return [...shapes].sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name));
}

/** Moves bodies as a whole; the parts of a group move with it, they sit relative to it. */
export function translateShapes(shapes: WorkplaneShape[], dx: number, dy: number, dz: number): WorkplaneShape[] {
  const clean = (value: number) => (Math.abs(value) < 1e-9 ? 0 : Math.round(value * 1e6) / 1e6);
  return shapes.map((shape) => ({
    ...shape,
    x: clean(shape.x + dx),
    z: clean(shape.z + dz),
    elevation: clean((shape.elevation ?? 0) + dy),
  }));
}

/**
 * Bodies as they are kept: the middle of their footprint on the origin and the
 * lowest point on the plate, wherever they stood in the design. Inserting then
 * only has to add the spot where they should go.
 */
export function shapesForLibrary(shapes: WorkplaneShape[], box: MyShapeBox) {
  return translateShapes(shapes, -(box.minX + box.maxX) / 2, -box.minY, -(box.minZ + box.maxZ) / 2);
}

/** Kept bodies put down with the middle of their footprint on `point` and their bottom at its height. */
export function shapesFromLibrary(shapes: WorkplaneShape[], point: { x: number; y: number; z: number }) {
  return translateShapes(shapes, point.x, point.y, point.z);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser keeps no local database"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(PACKAGE_STORE)) db.createObjectStore(PACKAGE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the shape library"));
    request.onblocked = () => reject(new Error("The shape library is busy in another tab"));
  });
}

async function withStores<T>(
  mode: IDBTransactionMode,
  work: (meta: IDBObjectStore, packages: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction([META_STORE, PACKAGE_STORE], mode);
      let result: T | undefined;
      const request = work(transaction.objectStore(META_STORE), transaction.objectStore(PACKAGE_STORE));
      if (request) request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error("The shape library could not be written"));
      transaction.onabort = () => reject(transaction.error ?? new Error("The shape library could not be written"));
    });
  } finally {
    db.close();
  }
}

function announceChange() {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(CHANGE_CHANNEL);
    channel.postMessage("changed");
    channel.close();
  } catch {
    // Other tabs then see the change the next time they open the library.
  }
}

/** Calls back when another tab saved, renamed or deleted one of the custom shapes. */
export function onMyShapesChanged(listener: () => void) {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(CHANGE_CHANNEL);
  channel.onmessage = () => listener();
  return () => channel.close();
}

function isMeta(value: unknown): value is MyShapeMeta {
  const meta = value as Partial<MyShapeMeta> | null;
  return Boolean(meta)
    && typeof meta?.id === "string"
    && typeof meta.name === "string"
    && typeof meta.createdAt === "number"
    && typeof meta.thumbnail === "string"
    && typeof meta.bodyCount === "number"
    && typeof meta.byteLength === "number";
}

export async function listMyShapes(): Promise<MyShapeMeta[]> {
  const records = await withStores<unknown[]>("readonly", (meta) => meta.getAll());
  return sortMyShapes((records ?? []).filter(isMeta));
}

export async function saveMyShape(meta: MyShapeMeta, bytes: Uint8Array) {
  await withStores("readwrite", (metaStore, packages) => {
    metaStore.put(meta);
    packages.put({ id: meta.id, bytes });
  });
  announceChange();
}

export async function readMyShapePackage(id: string): Promise<Uint8Array> {
  const record = await withStores<{ id: string; bytes: Uint8Array } | undefined>("readonly", (_meta, packages) => packages.get(id));
  if (!record || !(record.bytes instanceof Uint8Array)) throw new Error("This shape is no longer in the library");
  return record.bytes;
}

export async function renameMyShape(id: string, name: string) {
  const current = await withStores<unknown>("readonly", (meta) => meta.get(id));
  if (!isMeta(current)) throw new Error("This shape is no longer in the library");
  await withStores("readwrite", (meta) => {
    meta.put({ ...current, name });
  });
  announceChange();
}

export async function deleteMyShape(id: string) {
  await withStores("readwrite", (meta, packages) => {
    meta.delete(id);
    packages.delete(id);
  });
  announceChange();
}

type ManifestEntry = { file: string; name: string; createdAt: number; thumbnail: string; bodyCount: number; fingerprint?: string };

/**
 * The custom shapes of this browser as entries for a backup ZIP: one .lyl
 * each in the custom shapes folder, and a list with their names and
 * pictures, so a restore needs no editor to draw them again.
 */
export async function customShapesBackupEntries(): Promise<BackupEntry[]> {
  const list = await listMyShapes();
  if (list.length === 0) return [];
  const files = backupEntryNames(list.map((shape) => shape.name), "shape");
  const entries: BackupEntry[] = [];
  const manifest: ManifestEntry[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const shape = list[index];
    entries.push({ name: `${CUSTOM_SHAPES_BACKUP_FOLDER}/${files[index]}`, bytes: await readMyShapePackage(shape.id) });
    manifest.push({ file: files[index], name: shape.name, createdAt: shape.createdAt, thumbnail: shape.thumbnail, bodyCount: shape.bodyCount, fingerprint: shape.fingerprint });
  }
  entries.push({ name: `${CUSTOM_SHAPES_BACKUP_FOLDER}/${CUSTOM_SHAPES_MANIFEST}`, bytes: new TextEncoder().encode(JSON.stringify({ format: "com.layerling.custom-shapes", version: 1, shapes: manifest })) });
  return entries;
}

function manifestEntries(manifest: unknown): ManifestEntry[] {
  const shapes = (manifest as { shapes?: unknown } | null)?.shapes;
  if (!Array.isArray(shapes)) return [];
  return shapes.filter((entry): entry is ManifestEntry => Boolean(entry)
    && typeof entry.file === "string"
    && typeof entry.name === "string"
    && typeof entry.createdAt === "number"
    && typeof entry.thumbnail === "string"
    && (entry.thumbnail === "" || entry.thumbnail.startsWith("data:image/png;base64,"))
    && typeof entry.bodyCount === "number");
}

/**
 * Puts the custom shapes of a backup into this browser. A shape listed with
 * its picture goes straight in; one with the same name and bodies is already
 * there and is skipped. Packages without a list entry come back to the caller,
 * which can draw a picture for them.
 */
export async function restoreCustomShapesFromBackup(bytes: Uint8Array): Promise<{ added: number; skipped: number; unlisted: BackupEntry[] }> {
  const { entries, manifest } = unpackCustomShapes(bytes);
  if (entries.length === 0) return { added: 0, skipped: 0, unlisted: [] };
  const listed = new Map(manifestEntries(manifest).map((entry) => [entry.file, entry]));
  const existing = await listMyShapes();
  let added = 0;
  let skipped = 0;
  const unlisted: BackupEntry[] = [];
  for (const entry of entries) {
    const record = listed.get(entry.name);
    if (!record) {
      unlisted.push(entry);
      continue;
    }
    const name = cleanMyShapeName(record.name, myShapeNameFromFile(entry.name, "Shape"));
    if (existing.some((shape) => shape.name === name && (record.fingerprint ? shape.fingerprint === record.fingerprint : shape.byteLength === entry.bytes.byteLength))) {
      skipped += 1;
      continue;
    }
    const meta: MyShapeMeta = {
      id: createLocalId("my-shape"),
      name,
      createdAt: record.createdAt,
      thumbnail: record.thumbnail,
      bodyCount: record.bodyCount,
      byteLength: entry.bytes.byteLength,
      fingerprint: record.fingerprint,
    };
    await saveMyShape(meta, entry.bytes);
    existing.push(meta);
    added += 1;
  }
  return { added, skipped, unlisted };
}
