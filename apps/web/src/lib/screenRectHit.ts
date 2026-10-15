export type ScreenRect = { left: number; top: number; right: number; bottom: number };

function insideRect(x: number, y: number, rect: ScreenRect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function segmentsCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const side = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = side(cx, cy, dx, dy, ax, ay);
  const d2 = side(cx, cy, dx, dy, bx, by);
  const d3 = side(ax, ay, bx, by, cx, cy);
  const d4 = side(ax, ay, bx, by, dx, dy);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function segmentCrossesRect(ax: number, ay: number, bx: number, by: number, rect: ScreenRect) {
  const { left, top, right, bottom } = rect;
  return segmentsCross(ax, ay, bx, by, left, top, right, top)
    || segmentsCross(ax, ay, bx, by, right, top, right, bottom)
    || segmentsCross(ax, ay, bx, by, right, bottom, left, bottom)
    || segmentsCross(ax, ay, bx, by, left, bottom, left, top);
}

function pointInTriangle(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const negative = d1 < 0 || d2 < 0 || d3 < 0;
  const positive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(negative && positive);
}

/**
 * Whether a triangle drawn on the screen and a rectangle share any point:
 * a corner of the triangle lies in the rectangle, an edge crosses its border,
 * or the rectangle lies wholly inside the triangle.
 */
export function triangleTouchesRect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, rect: ScreenRect) {
  if (Math.max(ax, bx, cx) < rect.left || Math.min(ax, bx, cx) > rect.right || Math.max(ay, by, cy) < rect.top || Math.min(ay, by, cy) > rect.bottom) {
    return false;
  }
  if (insideRect(ax, ay, rect) || insideRect(bx, by, rect) || insideRect(cx, cy, rect)) return true;
  if (segmentCrossesRect(ax, ay, bx, by, rect) || segmentCrossesRect(bx, by, cx, cy, rect) || segmentCrossesRect(cx, cy, ax, ay, rect)) return true;
  return pointInTriangle(rect.left, rect.top, ax, ay, bx, by, cx, cy);
}
