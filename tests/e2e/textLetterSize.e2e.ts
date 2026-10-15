// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { ShapeInspector, type TextLayerPatch } from "@/components/workplane/ShapeInspector";
import { textLetterSize, textLetterSizePatch } from "@/lib/nameTag";
import { createTextGeometry } from "@/lib/textGeometry";
import { textLayerShapes } from "@/lib/textLayers";
import { loadTextFonts } from "@/lib/textFonts";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A plain text's settings (#215): "Letter size" stands above "Height" with a line saying what it
 * measures, "Height" says it is the thickness, and typing 30 into the letter size makes the
 * capitals 30 mm from above while the thickness stays - the panel driving the real geometry.
 */
beforeAll(async () => {
  await loadTextFonts();
  // jsdom lays nothing out; the panel only scrolls itself back to the top.
  Element.prototype.scrollTo ??= () => {};
});

let container: HTMLDivElement | null = null;
let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

function mount(shape: WorkplaneShape, onUpdate: (patch: Partial<WorkplaneShape>) => void, onLayerText?: (patch: TextLayerPatch) => void) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, {
      shape,
      snap: DEFAULT_SNAP_GRID,
      snapOpen: false,
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      onUpdate,
      onLayerText,
      onSnapChange: () => {},
      onSnapOpenChange: () => {},
    }));
  });
  return container;
}

const rowNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((row) => row.querySelector(".range-property-name")?.textContent === name);

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

/** The text's display mesh as it stands: how deep the letters are from above, and how thick. */
function measured(shape: WorkplaneShape) {
  const geometry = createTextGeometry(shape);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox as THREE.Box3;
  return { fromAbove: box.max.z - box.min.z, thickness: box.max.y - box.min.y };
}

describe("letter size on a plain text (#215)", () => {
  it("stands above Height, each with its line, and 30 makes the capitals 30 mm from above", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "text")!;
    const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), text: "HI" };
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(shape, (patch) => updates.push(patch));

    const names = [...panel.querySelectorAll(".range-property-name")].map((name) => name.textContent);
    expect(names.indexOf("Letter size")).toBeGreaterThanOrEqual(0);
    expect(names.indexOf("Letter size")).toBe(names.indexOf("Height") - 1);
    const letterRow = rowNamed(panel, "Letter size")!;
    const heightRow = rowNamed(panel, "Height")!;
    expect(letterRow.nextElementSibling?.textContent).toBe("How tall the capital letters are on the plate, seen from above.");
    expect(heightRow.nextElementSibling?.textContent).toBe("Thickness, from the plate upwards");

    type(letterRow.querySelector<HTMLInputElement>("input[type=text]")!, "30");
    expect(updates).toHaveLength(1);
    expect(updates[0].height).toBeUndefined();
    const next = { ...shape, ...updates[0] };
    const before = measured(shape);
    const after = measured(next);
    // H and I stand on the baseline and reach the cap height: 30 mm deep from above.
    expect(after.fromAbove).toBeCloseTo(30, 2);
    expect(after.thickness).toBeCloseTo(before.thickness, 6);
    expect(after.thickness).toBeCloseTo(shape.height, 6);
  });
});

describe("Make layers on a plain text (#215)", () => {
  it("splits it into the name tag's layers at 9 mm letters: 1.2, 1.2 and a 3 mm plate for the key ring tab", () => {
    const patches: TextLayerPatch[] = [];
    // A plain text whose capitals are 27.36 mm from above, as plazmabokor's was.
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "text")!;
    const plain = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), text: "HI" };
    const shape = { ...plain, ...textLetterSizePatch(plain, 27.36) };
    expect(measured(shape).fromAbove).toBeCloseTo(27.36, 2);
    const panel = mount(shape, () => {}, (patch) => patches.push(patch));
    const button = panel.querySelector<HTMLButtonElement>(".name-tag-start-button");
    expect(button).not.toBeNull();
    act(() => button!.click());
    expect(patches).toHaveLength(1);
    const { layers, letterSize } = patches[0];
    expect(layers?.map((layer) => [layer.grow, layer.height, Boolean(layer.silhouette)])).toEqual([[0, 1.2, false], [1.5, 1.2, false], [3, 3, true]]);
    // Built as the editor builds it: the letter size set on the text, then the layers.
    const letters = textLayerShapes({ ...shape, ...textLetterSizePatch(shape, letterSize ?? textLetterSize(shape)) }, layers!)[0];
    expect(measured(letters).fromAbove).toBeCloseTo(9, 2);
  });
});
