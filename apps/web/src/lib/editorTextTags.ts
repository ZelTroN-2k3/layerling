
import { t } from "@/lib/i18n";
import { nameTagOffsets, textLayerShapes, textLayersOf, type NameTagKeyring, type TextLayer, type TextLayerStack } from "@/lib/textLayers";
import { textLetterSize, textLetterSizePatch } from "@/lib/nameTag";
import { ICON_TAG_LAYERS, iconLayerElevations, iconLayerProfile, iconLayersOf, iconSourceProfile, iconTagGrid, isIconLayerBody, MAX_ICON_TAG_WIDTH, MIN_ICON_TAG_WIDTH, normalizeIconTagCount, scaledIconProfile, type IconLayerStack, type IconTagPlace } from "@/lib/iconTag";
import { shapeBedFootprint } from "@/lib/printBed";
import { canonicalizeShape, cloneWorkplaneShapeTreeWithFreshIds, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import { createLocalId } from "@/lib/localIds";
import { importedShapeFromSvg } from "@/lib/svgImport";
import { sketchProfileFromSvg, svgSketchMatchesMesh } from "@/lib/svgSketch";
import { strokedSketchProfile } from "@/lib/sketchStroke";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";
import { getManifoldRuntime } from "@/lib/editorMeshCore";
import { groupedShape, restoreGroupedChildren } from "@/lib/editorBooleans";
import { cadShapeFromSketchProfile } from "@/lib/editorSketchCad";

/**
 * The settings panel offers wrapping only where it is what people want: an
 * imported outline or model (an SVG above all), text and a sketch body. On a
 * box, a cylinder or a gear the card was only in the way; through MCP any
 * body can still be wrapped.
 */
/** A text, or a stack of text layers, that the layers card (#215) can work on. */
export function offersTextLayers(shape: WorkplaneShape | null | undefined) {
  if (!shape || shape.locked || shape.importedMesh || shape.cadBrep) return false;
  if (shape.kind === "text") return !shape.cylinderWrap;
  return Boolean(shape.layeredText && shape.groupOperation === "bundle" && shape.groupedShapes?.length);
}

/**
 * The text and layers a shape stands for: a plain text is one layer of itself; a layered-text
 * bundle is read from its parts as they stand in the world. Null for anything else.
 */
export function textLayerStack(shape: WorkplaneShape): TextLayerStack | null {
  if (shape.kind === "text") {
    return textLayersOf([shape]);
  }
  if (!shape.layeredText || !shape.groupedShapes?.length) return null;
  return textLayersOf(restoreGroupedChildren(shape));
}

/**
 * A text's layers as one shape: a bundle flagged as layered text, or, with one layer only, that
 * text itself. `keepId` and `name` carry over from the shape it replaces.
 */
export function layeredTextShape(source: WorkplaneShape, layers: readonly TextLayer[], ids: (string | undefined)[], keepId: string, keep: Pick<WorkplaneShape, "locked" | "hidden" | "name">, previousText?: string, keyring: NameTagKeyring | null = null): WorkplaneShape {
  const words = (source.text ?? "TEXT").trim() || "Text";
  // The stack is named after its words unless somebody gave it a name of its own.
  const name = !keep.name || keep.name === "Bundle" || keep.name === "Text" || keep.name === previousText ? words : keep.name;
  const parts = textLayerShapes(source, layers, ids, keyring);
  if (parts.length === 1) return canonicalizeShape({ ...parts[0], id: keepId, name, locked: keep.locked, hidden: keep.hidden });
  const group = groupedShape(parts);
  if (!group) throw new Error("Could not build the text layers");
  return canonicalizeShape({ ...group, id: keepId, name, groupOperation: "bundle", layeredText: true, locked: keep.locked, hidden: keep.hidden });
}

/**
 * The name tag panel (#215): the letters of a stack with other words, another font or another
 * letter size. New words or another font keep the letter size, so a tag grows with its name.
 */
export function nameTagSource(source: WorkplaneShape, change: { text?: string; font?: string; letterSize?: number }): WorkplaneShape {
  const next = { ...source, ...(change.text !== undefined ? { text: change.text } : {}), ...(change.font !== undefined ? { font: change.font } : {}) };
  if (change.text === undefined && change.font === undefined && change.letterSize === undefined) return next;
  return { ...next, ...textLetterSizePatch(next, change.letterSize ?? textLetterSize(source)) };
}

/**
 * The panel's name list (#215): one tag per name like the given stack, at its letter size, in
 * rows and columns from the place of the first, which takes `first`'s id and its layers' ids.
 */
export function nameTagsFor(stack: { source: WorkplaneShape; layers: readonly TextLayer[]; keyring: NameTagKeyring | null }, names: readonly string[], gap: number, first: { id: string; ids: string[] }): WorkplaneShape[] {
  const tags = names.map((name, index) => layeredTextShape(
    nameTagSource(stack.source, { text: name }),
    stack.layers,
    index === 0 ? first.ids : [],
    index === 0 ? first.id : createLocalId("text-tag"),
    { locked: false, hidden: false, name },
    stack.source.text,
    stack.keyring,
  ));
  // Every tag is as wide as its name; the rows take the widest and deepest.
  const width = Math.max(...tags.map(shapeWidth));
  const depth = Math.max(...tags.map(shapeDepth));
  const columns = Math.max(1, Math.round(Math.sqrt((tags.length * (depth + gap)) / (width + gap))));
  const offsets = nameTagOffsets(tags.length, width, depth, gap, columns);
  return tags.map((tag, index) => (index === 0 ? tag : canonicalizeShape({ ...tag, x: tag.x + offsets[index].x, z: tag.z + offsets[index].z })));
}

/**
 * The icon tag: a sketch body (an imported SVG above all) or a stack of its layers that the icon
 * tag card can work on. A revolved sketch, a group or a locked body has no such card.
 */
export function offersIconLayers(shape: WorkplaneShape | null | undefined) {
  if (!shape || shape.locked || shape.cylinderWrap) return false;
  if (isIconLayerBody(shape)) return !shape.edgeTreatments?.length;
  return Boolean(shape.layeredIcon && shape.groupOperation === "bundle" && shape.groupedShapes?.length);
}

/** The icon and layers a shape stands for: a sketch body is one layer of itself; an icon tag is read from its parts. */
export function iconLayerStack(shape: WorkplaneShape): IconLayerStack | null {
  if (isIconLayerBody(shape)) return iconLayersOf([shape]);
  if (!shape.layeredIcon || !shape.groupedShapes?.length) return null;
  return iconLayersOf(restoreGroupedChildren(shape));
}

/**
 * The icon's outline as an area at the width asked for: a drawing made of lines becomes the area
 * of its line first, so every layer can take a "Wider" line round it. `width` is the icon's,
 * `currentWidth` how wide the outline comes out as it is.
 */
export async function iconTagArea(source: SketchProfile, currentWidth: number, width: number) {
  let area: SketchProfile = { points: source.points, segments: source.segments };
  if (source.stroke) {
    const stroked = strokedSketchProfile(await getManifoldRuntime(), source);
    if (!stroked) throw new Error(t("sketch.strokeEmpty"));
    area = { points: stroked.points, segments: stroked.segments };
  }
  const wanted = Math.min(MAX_ICON_TAG_WIDTH, Math.max(MIN_ICON_TAG_WIDTH, width));
  return scaledIconProfile(area, wanted / Math.max(1e-6, currentWidth));
}

/**
 * An icon's layers as one shape, standing at `place`: each layer a sketch body built by the CAD
 * kernel, centred on the icon's middle, the bottom one on the place's elevation and each next
 * on the one below; a bundle flagged as an icon tag, or with one layer only, that body itself.
 */
export async function layeredIconShape(area: SketchProfile, layers: readonly TextLayer[], place: IconTagPlace, ids: (string | undefined)[], keepId: string, keep: Pick<WorkplaneShape, "locked" | "hidden" | "name">): Promise<WorkplaneShape> {
  const name = keep.name || "Icon tag";
  const elevations = iconLayerElevations(layers, place.elevation);
  const parts = await Promise.all(layers.map(async (layer, index) => {
    const built = await cadShapeFromSketchProfile(iconLayerProfile(area, layer), layer.height);
    return canonicalizeShape({
      ...built,
      id: ids[index] ?? createLocalId("icon-layer"),
      name: layers.length > 1 ? `${name} ${index + 1}` : name,
      color: layer.color,
      hole: false,
      x: place.x,
      z: place.z,
      elevation: elevations[index],
      rotation: place.rotation,
      rotationX: place.rotationX,
      rotationZ: place.rotationZ,
    });
  }));
  if (parts.length === 1) return canonicalizeShape({ ...parts[0], id: keepId, name, locked: keep.locked, hidden: keep.hidden });
  const group = groupedShape(parts);
  if (!group) throw new Error("Could not build the icon layers");
  return canonicalizeShape({ ...group, id: keepId, name, groupOperation: "bundle", layeredIcon: true, locked: keep.locked, hidden: keep.hidden });
}

/**
 * Copies of a tag in a grid on the plate (the icon tag's count): `count` of them centred on the
 * plate's middle, as many to a row as its width takes, the first being the tag itself.
 */
export function iconTagCopies(tag: WorkplaneShape, count: number, plate: { width: number; depth: number }): WorkplaneShape[] {
  const footprint = shapeBedFootprint(tag);
  const size = { width: footprint.maxX - footprint.minX, depth: footprint.maxZ - footprint.minZ };
  // The grid places footprints; the tag's own point may sit off the middle of its footprint.
  const offsetX = tag.x - (footprint.minX + footprint.maxX) / 2;
  const offsetZ = tag.z - (footprint.minZ + footprint.maxZ) / 2;
  return iconTagGrid(normalizeIconTagCount(count), size, plate).map((spot, index) => canonicalizeShape({
    ...(index === 0 ? tag : cloneWorkplaneShapeTreeWithFreshIds(tag, `copy${index}`)),
    x: Math.round((spot.x + offsetX) * 1000) / 1000,
    z: Math.round((spot.z + offsetZ) * 1000) / 1000,
  }));
}

/**
 * An SVG file's icon as an area `width` mm wide, and the name a tag of it takes - the file's.
 * As the import does (#197), a drawing the kernel builds differently from the mesh is refused.
 */
export async function svgIconArea(fileName: string, text: string, width: number) {
  const profile = sketchProfileFromSvg(text);
  if (!profile) throw new Error(t("iconTag.unreadable"));
  const probe = await cadShapeFromSketchProfile(profile, 1).catch(() => null);
  if (!probe || !svgSketchMatchesMesh(probe, { ...importedShapeFromSvg(fileName, text), mirrorZ: true })) throw new Error(t("iconTag.unreadable"));
  const area = await iconTagArea(iconSourceProfile(profile), probe.width, width);
  return { area, name: fileName.replace(/\.svg$/i, "").trim() || "Icon tag" };
}

/** An SVG file's text as a new icon tag in the start layers, `width` mm wide, standing on the plate's middle. */
export async function iconTagFromSvg(fileName: string, text: string, width: number): Promise<WorkplaneShape> {
  const { area, name } = await svgIconArea(fileName, text, width);
  return layeredIconShape(area, ICON_TAG_LAYERS, { x: 0, z: 0, elevation: 0, rotation: 0, rotationX: 0, rotationZ: 0 }, [], createLocalId("icon-tag"), { locked: false, hidden: false, name });
}
