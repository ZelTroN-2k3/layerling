import { SHARED_PROJECTS_ENDPOINT } from "@/lib/sharedProjectsEndpoint";

/*
 * Custom shapes on the server: one folder of the shared store, with one .lyl
 * per shape - the same files and the same requests as any design there, so
 * store.php and the Node route need nothing new. The folder shows on the start
 * page too, where a shape can be opened and changed like a design. Its name is
 * English on purpose: it is one folder for every language.
 */

export const CUSTOM_SHAPES_FOLDER = "Custom shapes";
const LYL_MEDIA_TYPE = "application/vnd.layerling.project+zip";

export type ServerCustomShape = {
  fileName: string;
  name: string;
  updatedAt: number;
  size: number;
  revision: string;
  thumbnailUrl?: string;
};

function query(fileName?: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ path: CUSTOM_SHAPES_FOLDER, ...extra });
  if (fileName) params.set("fileName", fileName);
  return `${SHARED_PROJECTS_ENDPOINT}?${params.toString()}`;
}

async function failure(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({})) as { error?: string };
  return new Error(payload.error ?? fallback);
}

/** The file a shape is kept under: its name, made safe for every file system. */
export function customShapeFileName(name: string) {
  const base = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim().replace(/^\.+/, "").slice(0, 100) || "Shape";
  return `${base}.lyl`;
}

/**
 * The shapes in the folder, or null when the server keeps nothing (no store
 * on this installation). A store without the folder yet has no shapes.
 */
export async function listServerCustomShapes(): Promise<ServerCustomShape[] | null> {
  const rootResponse = await fetch(SHARED_PROJECTS_ENDPOINT, { cache: "no-store" }).catch(() => null);
  if (!rootResponse) return null;
  const root = await rootResponse.json().catch(() => ({})) as { enabled?: boolean; folders?: Array<{ name: string }> };
  if (!root.enabled) return null;
  if (!root.folders?.some((folder) => folder.name === CUSTOM_SHAPES_FOLDER)) return [];
  const response = await fetch(query(), { cache: "no-store" });
  if (!response.ok) throw await failure(response, "Could not list the custom shapes on the server");
  const payload = await response.json() as { projects?: ServerCustomShape[] };
  return (payload.projects ?? []).sort((a, b) => a.updatedAt - b.updatedAt || a.name.localeCompare(b.name));
}

async function ensureFolder() {
  const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${new URLSearchParams({ folder: CUSTOM_SHAPES_FOLDER }).toString()}`, { method: "POST" });
  // 409: it is there already, which is what we wanted.
  if (!response.ok && response.status !== 409) throw await failure(response, "Could not create the custom shapes folder on the server");
}

/** Puts a new shape into the folder; a name already taken is refused, never overwritten. */
export async function saveServerCustomShape(name: string, bytes: Uint8Array, thumbnailDataUrl: string, takenMessage: string) {
  await ensureFolder();
  const fileName = customShapeFileName(name);
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const form = new FormData();
  form.append("project", new Blob([body], { type: LYL_MEDIA_TYPE }), fileName);
  if (thumbnailDataUrl.startsWith("data:image/png")) {
    const thumbnail = await (await fetch(thumbnailDataUrl)).blob();
    if (thumbnail.size > 0) form.append("thumbnail", thumbnail, `${fileName}.png`);
  }
  const response = await fetch(query(fileName), { method: "POST", headers: { "If-None-Match": "*" }, body: form });
  if (response.status === 409 || response.status === 412) throw new Error(takenMessage);
  if (!response.ok) throw await failure(response, "Could not save the shape on the server");
  const payload = await response.json() as { project?: ServerCustomShape };
  if (!payload.project) throw new Error("Could not save the shape on the server");
  return payload.project;
}

export async function readServerCustomShape(fileName: string) {
  const response = await fetch(query(fileName), { cache: "no-store" });
  if (!response.ok) throw await failure(response, "This shape is no longer on the server");
  return new Uint8Array(await response.arrayBuffer());
}

export async function deleteServerCustomShape(shape: Pick<ServerCustomShape, "fileName" | "revision">) {
  const response = await fetch(query(shape.fileName), { method: "DELETE", headers: { "If-Match": `"${shape.revision}"` } });
  if (!response.ok) throw await failure(response, "Could not delete the shape on the server");
}

/** There is no renaming a file in the store, so it is a copy under the new name, then away with the old one. */
export async function renameServerCustomShape(shape: Pick<ServerCustomShape, "fileName" | "revision">, name: string, takenMessage: string) {
  const target = customShapeFileName(name);
  if (target === shape.fileName) return;
  const response = await fetch(query(shape.fileName, { copyTo: target }), { method: "POST", headers: { "If-Match": `"${shape.revision}"` } });
  if (response.status === 409) throw new Error(takenMessage);
  if (!response.ok) throw await failure(response, "Could not rename the shape on the server");
  await deleteServerCustomShape(shape);
}
