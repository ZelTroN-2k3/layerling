import type { WorkplaneShape } from "@/types/layerling";

/** The words a shape is found by: its shown name and its kind label, both in the interface language. */
export type ObjectListLabels = (shape: WorkplaneShape) => string[];

/** The search text as it is matched: trimmed and lower-case; empty means no search. */
export function normalizeObjectListQuery(text: string): string {
  return text.trim().toLowerCase();
}

/** True when the shape itself matches - its labels or its internal kind contain the query. */
export function shapeMatchesSearch(shape: WorkplaneShape, query: string, labels: ObjectListLabels): boolean {
  if (!query) return true;
  return [...labels(shape), shape.kind].some((word) => word.toLowerCase().includes(query));
}

/** True when a part at any depth inside the group matches; never for an empty query. */
export function hasMatchingPart(shape: WorkplaneShape, query: string, labels: ObjectListLabels): boolean {
  if (!query) return false;
  return (shape.groupedShapes ?? []).some(
    (child) => shapeMatchesSearch(child, query, labels) || hasMatchingPart(child, query, labels),
  );
}

/** Whether a shape stays in the list: it matches, or it is a group with a match somewhere inside. */
export function showInObjectList(shape: WorkplaneShape, query: string, labels: ObjectListLabels): boolean {
  return shapeMatchesSearch(shape, query, labels) || hasMatchingPart(shape, query, labels);
}
