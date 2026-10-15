// Stages the occt-wasm runtime (Emscripten glue + 22 MB WASM) into the web app's
// public/ folder so the STEP exporter can load it lazily at runtime. The kernel is
// imported via a webpackIgnore dynamic import from /occt/, deliberately bypassing
// the Next.js bundler — Emscripten glue does not survive bundling. The copied files
// are gitignored; this script runs before dev/build to recreate them from the package.
import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "occt-wasm", "dist");
const occtRoot = join(root, "apps", "web", "public", "occt");

if (!existsSync(src)) {
  console.error(`[copy-occt-wasm] occt-wasm not installed at ${src}. Run \`npm install\` first.`);
  process.exit(1);
}

// The files keep their names from one kernel release to the next, so a browser
// could pair freshly bundled app code with a cached older kernel. Each version
// gets its own folder instead; the app reads the same version at build time.
const { version } = JSON.parse(await readFile(join(root, "node_modules", "occt-wasm", "package.json"), "utf8"));
const dest = join(occtRoot, version);
await mkdir(occtRoot, { recursive: true });
for (const entry of await readdir(occtRoot)) {
  if (entry !== version) await rm(join(occtRoot, entry), { recursive: true, force: true });
}
await mkdir(dest, { recursive: true });

const entries = await readdir(src);
const wanted = entries.filter((name) => name.endsWith(".js") || name.endsWith(".wasm"));
await Promise.all(wanted.map((name) => cp(join(src, name), join(dest, name))));

console.log(`[copy-occt-wasm] staged ${wanted.length} files into apps/web/public/occt/${version}/`);
