import type { FontData } from "three/examples/jsm/loaders/FontLoader.js";
import { checkedTypefaceData, isCustomFontId, type CustomTypeface } from "@/lib/customFonts";
import { registerCustomFont } from "@/lib/textFonts";

/*
 * Fonts of one's own are kept in this browser's IndexedDB, already read into the typeface format,
 * so the editor starts without reading font files again. They stay with this browser profile:
 * another browser or computer has its own list. A design carries the letters it uses (see
 * lylProject.ts), so it opens anywhere; only typing new letters needs the font there too.
 */

const DB_NAME = "layerling-fonts";
const DB_VERSION = 1;
const STORE = "fonts";
const CHANGE_CHANNEL = "layerling-fonts";

type StoredFont = { id: string; name: string; addedAt: number; data: FontData };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser keeps no local database"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the font list"));
    request.onblocked = () => reject(new Error("The font list is busy in another tab"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      let result: T | undefined;
      const request = work(transaction.objectStore(STORE));
      if (request) request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error("The font list could not be written"));
      transaction.onabort = () => reject(transaction.error ?? new Error("The font list could not be written"));
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
    // Other tabs see the font the next time the editor starts.
  }
}

/** The fonts kept in this browser, lightest first: id, name and when they came. */
export async function storedCustomFonts(): Promise<Array<{ id: string; name: string; addedAt: number }>> {
  const all = (await withStore<StoredFont[]>("readonly", (store) => store.getAll() as IDBRequest<StoredFont[]>)) ?? [];
  return all
    .filter((font) => isCustomFontId(font?.id) && typeof font.name === "string")
    .map(({ id, name, addedAt }) => ({ id, name, addedAt }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Registers every font kept in this browser with the text shape. Never fails: without a
 * database (a private window, say) there are simply none, and a damaged entry is skipped.
 */
export async function loadStoredCustomFonts() {
  try {
    const all = (await withStore<StoredFont[]>("readonly", (store) => store.getAll() as IDBRequest<StoredFont[]>)) ?? [];
    for (const font of all) {
      try {
        if (!isCustomFontId(font?.id) || typeof font.name !== "string") continue;
        registerCustomFont({ id: font.id, name: font.name, data: checkedTypefaceData(font.data, font.name) }, true);
      } catch {
        // One damaged font must not keep the others away.
      }
    }
  } catch {
    // No database here: the built-in fonts still work.
  }
}

/** Keeps a font in this browser and makes it usable at once. */
export async function storeCustomFont(typeface: CustomTypeface) {
  registerCustomFont(typeface, true);
  await withStore("readwrite", (store) => store.put({ id: typeface.id, name: typeface.name, addedAt: Date.now(), data: typeface.data } satisfies StoredFont));
  announceChange();
}

/**
 * Takes a font off this browser's list. Texts in the open design keep it until the design is
 * closed, and the design still carries their letters when it is saved.
 */
export async function deleteStoredCustomFont(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
  announceChange();
}

/** Calls back when another tab added or removed a font. */
export function onStoredCustomFontsChanged(listener: () => void) {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(CHANGE_CHANNEL);
  channel.onmessage = () => listener();
  return () => channel.close();
}
