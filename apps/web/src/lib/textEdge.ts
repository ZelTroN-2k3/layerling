import type { TextEdge, WorkplaneShape } from "@/types/layerling";

/**
 * The top edge of a text's letters (#225): rounded or chamfered, the way a printed name tag's
 * letters on top are finished. The geometry is built in textFill; this is what the shape, a saved
 * design and the layers card agree on, kept free of the 3D libraries so a design file can check it.
 */

export const MIN_TEXT_EDGE = 0.05;
export const MAX_TEXT_EDGE = 5;

/** A letter edge as the shape holds it: round or chamfer, its size within the limits; undefined for none or nonsense. */
export function normalizeTextEdge(value: unknown): TextEdge | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { kind, size } = value as { kind?: unknown; size?: unknown };
  const width = Number(size);
  if ((kind !== "round" && kind !== "chamfer") || !Number.isFinite(width)) return undefined;
  return { kind, size: Math.round(Math.min(MAX_TEXT_EDGE, Math.max(MIN_TEXT_EDGE, width)) * 1000) / 1000 };
}

/** Whether the letters of this text get their top edge rounded or chamfered. */
export function textHasEdge(shape: Pick<WorkplaneShape, "kind" | "textEdge">) {
  return shape.kind === "text" && Boolean(normalizeTextEdge(shape.textEdge));
}

/**
 * How far the outline stands in from its full size at each of the edge's `steps + 1` boundaries,
 * and how high each stands above where the edge begins: a quarter circle for round, a straight
 * slope at 45 degrees for chamfer. The first is (0, 0), the last (size, size).
 */
export function textEdgeLevels(edge: TextEdge, steps: number): { height: number; inset: number }[] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    if (edge.kind === "chamfer") {
      const along = (edge.size * index) / steps;
      return { height: along, inset: along };
    }
    const angle = (index / steps) * (Math.PI / 2);
    return { height: edge.size * Math.sin(angle), inset: edge.size * (1 - Math.cos(angle)) };
  });
}
