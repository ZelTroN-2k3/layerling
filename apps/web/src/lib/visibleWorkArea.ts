export type VisibleWorkArea = { left: number; right: number; top: number; bottom: number };

/**
 * The part of the workplane that is really seen, in pixels relative to
 * `element`: its own box less the camera bar on the left and the settings
 * panel on the right, which lie over the canvas. Dimension figures are kept
 * inside it, and the view follows bodies pushed past it with the arrow keys.
 */
export function visibleWorkArea(element: Element | null, width: number, height: number): VisibleWorkArea {
  const area = { left: 0, right: width, top: 0, bottom: height };
  if (!element) return area;
  const own = element.getBoundingClientRect();
  const middle = own.left + own.width / 2;
  element.ownerDocument.querySelectorAll(".camera-controls, .shape-inspector").forEach((panel) => {
    const rect = panel.getBoundingClientRect();
    if (rect.width === 0 || rect.bottom < own.top || rect.top > own.bottom) return;
    if (rect.right < middle) area.left = Math.max(area.left, rect.right - own.left);
    else if (rect.left > middle) area.right = Math.min(area.right, rect.left - own.left);
  });
  return area;
}
