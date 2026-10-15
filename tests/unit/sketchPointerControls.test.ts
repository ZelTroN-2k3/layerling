import { describe, expect, it } from "vitest";
import { isSketchPanGesture, SKETCH_MANUAL_MAX_ZOOM, SKETCH_MAX_ZOOM, sketchWheelZoomFactor, zoomSketchViewAt } from "@/lib/sketchPointerControls";

describe("sketch pointer controls", () => {
  it("pans with the middle mouse button", () => {
    expect(isSketchPanGesture({ button: 1, ctrlKey: false, metaKey: false, shiftKey: false })).toBe(true);
  });

  it("pans with Ctrl or Cmd plus the right mouse button", () => {
    expect(isSketchPanGesture({ button: 2, ctrlKey: true, metaKey: false, shiftKey: false })).toBe(true);
    expect(isSketchPanGesture({ button: 2, ctrlKey: false, metaKey: true, shiftKey: false })).toBe(true);
  });

  it("pans with Shift plus the right mouse button, like the 3D editor", () => {
    expect(isSketchPanGesture({ button: 2, ctrlKey: false, metaKey: false, shiftKey: true })).toBe(true);
  });

  it("does not repurpose unmodified or primary-button input", () => {
    expect(isSketchPanGesture({ button: 2, ctrlKey: false, metaKey: false, shiftKey: false })).toBe(false);
    expect(isSketchPanGesture({ button: 0, ctrlKey: true, metaKey: false, shiftKey: false })).toBe(false);
    expect(isSketchPanGesture({ button: 0, ctrlKey: false, metaKey: true, shiftKey: false })).toBe(false);
    expect(isSketchPanGesture({ button: 0, ctrlKey: false, metaKey: false, shiftKey: true })).toBe(false);
  });

  it("zooms by the same wheel curve as the 3D editor", () => {
    expect(sketchWheelZoomFactor({ deltaY: 100, deltaMode: 0, ctrlKey: false }, 2)).toBeCloseTo(0.95 ** 2);
    expect(sketchWheelZoomFactor({ deltaY: -100, deltaMode: 0, ctrlKey: false }, 2)).toBeCloseTo(0.95 ** -2);
    expect(sketchWheelZoomFactor({ deltaY: 3, deltaMode: 1, ctrlKey: false }, 1)).toBeCloseTo(0.95 ** 0.48);
  });

  it("keeps the plate point under the pointer fixed while zooming", () => {
    const view = { zoom: 1.5, pan: { x: 10, z: -4 } };
    const offset = { x: 120, y: -60 };
    const pixelsPerUnit = 3;
    const next = zoomSketchViewAt(view, 1.4, offset, pixelsPerUnit, { width: 400, depth: 400 });
    const under = (v: typeof view) => ({ x: v.pan.x + offset.x / (pixelsPerUnit * v.zoom), z: v.pan.z + offset.y / (pixelsPerUnit * v.zoom) });
    expect(next.zoom).toBeCloseTo(2.1);
    expect(under(next).x).toBeCloseTo(under(view).x);
    expect(under(next).z).toBeCloseTo(under(view).z);
  });

  it("zooms past the Shift+F framing limit", () => {
    const view = { zoom: SKETCH_MAX_ZOOM, pan: { x: 0, z: 0 } };
    expect(zoomSketchViewAt(view, 2, { x: 0, y: 0 }, 3, { width: 400, depth: 400 }).zoom).toBe(SKETCH_MAX_ZOOM * 2);
  });

  it("leaves the pan alone once the zoom limit is reached", () => {
    const view = { zoom: SKETCH_MANUAL_MAX_ZOOM, pan: { x: 5, z: 5 } };
    expect(zoomSketchViewAt(view, 2, { x: 100, y: 100 }, 3, { width: 400, depth: 400 })).toEqual(view);
  });
});
