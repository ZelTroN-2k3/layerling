// Empties the build caches of the web app: .next/cache (production builds, grows with every
// release) and .next-dev/cache (the development server). They are only a speed-up and are built
// again; the first build or start after this takes longer. Stop `npm run dev` first.
import { existsSync } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const caches = ["apps/web/.next/cache", "apps/web/.next-dev/cache", "apps/web/.next-export/cache"].map((entry) => join(root, entry));

async function sizeOf(path) {
  const info = await stat(path);
  if (!info.isDirectory()) return info.size;
  let total = 0;
  for (const name of await readdir(path)) total += await sizeOf(join(path, name));
  return total;
}

let freed = 0;
for (const cache of caches) {
  if (!existsSync(cache)) continue;
  const size = await sizeOf(cache);
  try {
    await rm(cache, { recursive: true, force: true });
    freed += size;
    console.log(`[clean-cache] removed ${cache.replace(root, ".")} (${(size / 1024 / 1024).toFixed(0)} MB)`);
  } catch (error) {
    console.error(`[clean-cache] could not remove ${cache}: ${error.message} - is the dev server still running?`);
  }
}
console.log(`[clean-cache] freed ${(freed / 1024 / 1024).toFixed(0)} MB`);
