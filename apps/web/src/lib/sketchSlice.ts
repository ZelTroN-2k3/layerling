export type SliceVertex = { x: number; h: number; z: number };

/** How far off the workplane the body is cut, towards the side the sketch is pulled up to. */
export const SLICE_OFFSET = 0.001;

/** Whether a plane through the body cuts it: material lies clearly on both sides. */
export function planeCutsMesh(heights: readonly number[], tolerance = SLICE_OFFSET) {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  heights.forEach((height) => {
    low = Math.min(low, height);
    high = Math.max(high, height);
  });
  return low < -tolerance && high > tolerance;
}

const keyOf = (x: number, z: number) => `${Math.round(x * 2000)},${Math.round(z * 2000)}`;

type Point = { x: number; z: number };
type Segment = { a: Point; b: Point };

/**
 * The outline of a body where a plane cuts it, as an SVG path of closed loops (fill it with the
 * even-odd rule: a hollow body gives a ring). The plane lies `level` above the workplane; `x` and
 * `z` are the workplane's own coordinates, the same ones the sketch is drawn in. Null when
 * nothing is cut.
 */
export function meshSlicePath(vertices: readonly SliceVertex[], faces: ReadonlyArray<readonly [number, number, number]>, level = SLICE_OFFSET): string | null {
  const segments: Segment[] = [];
  for (const [ia, ib, ic] of faces) {
    const corners = [vertices[ia], vertices[ib], vertices[ic]];
    if (corners.some((corner) => !corner)) continue;
    const crossing: Point[] = [];
    for (let index = 0; index < 3; index += 1) {
      const from = corners[index];
      const to = corners[(index + 1) % 3];
      const fromBelow = from.h - level < 0;
      const toBelow = to.h - level < 0;
      if (fromBelow === toBelow) continue;
      const amount = (level - from.h) / (to.h - from.h);
      crossing.push({ x: from.x + (to.x - from.x) * amount, z: from.z + (to.z - from.z) * amount });
    }
    if (crossing.length === 2) segments.push({ a: crossing[0], b: crossing[1] });
  }
  if (segments.length === 0) return null;

  // Chain the segments end to end into loops.
  const ends = new Map<string, number[]>();
  segments.forEach((segment, index) => {
    for (const point of [segment.a, segment.b]) {
      const key = keyOf(point.x, point.z);
      const list = ends.get(key);
      if (list) list.push(index);
      else ends.set(key, [index]);
    }
  });
  const used = new Array<boolean>(segments.length).fill(false);
  const loops: Point[][] = [];
  for (let start = 0; start < segments.length; start += 1) {
    if (used[start]) continue;
    used[start] = true;
    const loop: Point[] = [segments[start].a, segments[start].b];
    let tail = segments[start].b;
    for (let guard = 0; guard < segments.length; guard += 1) {
      const key = keyOf(tail.x, tail.z);
      const next = (ends.get(key) ?? []).find((candidate) => !used[candidate]);
      if (next === undefined) break;
      used[next] = true;
      const segment = segments[next];
      const forward = keyOf(segment.a.x, segment.a.z) === key;
      tail = forward ? segment.b : segment.a;
      loop.push(tail);
      if (keyOf(tail.x, tail.z) === keyOf(loop[0].x, loop[0].z)) break;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  if (loops.length === 0) return null;
  return loops.map((loop) => `M ${loop.map((point) => `${Number(point.x.toFixed(4))} ${Number(point.z.toFixed(4))}`).join(" L ")} Z`).join(" ");
}
