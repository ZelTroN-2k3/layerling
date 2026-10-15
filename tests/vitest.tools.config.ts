import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = path.resolve(__dirname, "..");

/**
 * Werkzeuge, die Dateien im Baum erzeugen statt etwas zu pruefen - deshalb
 * laufen sie nicht bei `npm test` mit, sondern nur, wenn man sie ruft.
 */
export default defineConfig({
  root: rootDir,
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "apps/web/src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/tools/**/*.tool.ts"],
  },
});
