import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The viewport's canvas code reads many props through refs, because its event
// handlers and render loop outlive a single render. A ref that is created from
// a prop but never written again keeps the value from the first render. That
// is how the mirror arrows disappeared in 1.15.0: the shapes list behind them
// stayed empty, so no shape added later ever got its arrows.
describe("props the viewport keeps in refs", () => {
  const source = readFileSync(
    fileURLToPath(new URL("../../apps/web/src/components/WorkplaneViewport.tsx", import.meta.url)),
    "utf8",
  );

  it("writes every reference-shapes ref again after the first render", () => {
    const refs = [...source.matchAll(/const (\w+ReferenceShapesRef) = useRef\((\w+)\)/g)];
    expect(refs.map((match) => match[1])).toEqual(expect.arrayContaining(["alignReferenceShapesRef", "mirrorReferenceShapesRef"]));
    for (const [, ref, prop] of refs) {
      expect(source, `${ref} is never updated from ${prop}`).toContain(`${ref}.current = ${prop};`);
    }
  });
});
