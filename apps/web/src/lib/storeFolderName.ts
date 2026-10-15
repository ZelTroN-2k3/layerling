/**
 * The rules for a folder name inside the server store.
 *
 * They exist twice on purpose: `store.php` (and the Node route beside it)
 * enforces them, because a browser can send anything, and the dialog checks
 * the same names while they are typed, so nobody learns from a failed request
 * that a slash is not allowed. Keep the two in step - `folder_name_ok` in
 * `apps/web/public/store.php` is the original.
 */

/** What a name may not contain, on any of the systems this can run on. */
export const STORE_FOLDER_UNSAFE = "<>:\"|?*/\\";

export const STORE_FOLDER_NAME_LIMIT = 80;

export type StoreFolderProblem = "empty" | "start" | "chars" | "taken";

export function storeFolderNameProblem(name: string, existing: readonly string[]): StoreFolderProblem | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") return "empty";
  if (trimmed.startsWith(".")) return "start";
  if (trimmed.length > STORE_FOLDER_NAME_LIMIT) return "chars";
  if ([...trimmed].some((character) => STORE_FOLDER_UNSAFE.includes(character) || character.charCodeAt(0) < 32)) return "chars";
  if (existing.some((folder) => folder.toLowerCase() === trimmed.toLowerCase())) return "taken";
  return null;
}

/** A free name, so the dialog opens on something that can simply be confirmed. */
export function suggestStoreFolderName(base: string, existing: readonly string[]) {
  const taken = new Set(existing.map((folder) => folder.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base} ${index}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return base;
}
