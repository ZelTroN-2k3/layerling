import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { cadHasSolidBody } from "@/lib/cadSolidBody";

// A rounded box 40 x 20 x 30 with its eight corner edges chamfered by 1 mm, as a user's design stored it.
describe("a fillet that leaves no solid (forum report, 06.10.2026)", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  it("is recognised: a radius of 2 mm returns a compound without a solid, 1.5 mm a real one", () => {
    const body = kernel.fromBREP(readFileSync(join(__dirname, "..", "fixtures", "chamfered-rounded-box.brep"), "utf8"));
    const edges = kernel.getSubShapes(body, "edge");
    const fine = kernel.fillet(body, edges, 1.5);
    expect(cadHasSolidBody(kernel, fine)).toBe(true);
    const broken = kernel.fillet(body, edges, 2);
    expect(kernel.isValid(broken)).toBe(true);
    expect(cadHasSolidBody(kernel, broken)).toBe(false);
  });
});
