export type SketchPointerModifiers = {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export function isSketchPanGesture(event: SketchPointerModifiers) {
  return event.button === 1 || (event.button === 2 && (event.ctrlKey || event.metaKey || event.shiftKey));
}

export type SketchView = { zoom: number; pan: { x: number; z: number } };

export const SKETCH_MIN_ZOOM = 0.75;
// Cap for Shift+F framing, so focusing a small selection keeps some context.
export const SKETCH_MAX_ZOOM = 6;
// Manual zoom (wheel, buttons) can go much further, like the 3D editor; the
// cap only guards against runaway values.
export const SKETCH_MANUAL_MAX_ZOOM = 10000;

// The 3D editor's wheel step moves the camera toward its orbit target, which
// usually magnifies nearby geometry more than the step itself. A flat 2D scale
// by the same step feels sluggish next to it, so the sketch wheel runs faster.
export const SKETCH_WHEEL_ZOOM_BOOST = 2;

export type SketchWheelInput = {
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
};

/**
 * Zoom multiplier for one wheel event, using the same curve as the 3D
 * editor's OrbitControls: 0.95^(zoomSpeed * deltaY / 100), with line/page
 * deltas and trackpad pinches (Ctrl + wheel) scaled the way OrbitControls does.
 */
export function sketchWheelZoomFactor(event: SketchWheelInput, orbitZoomSpeed: number) {
  let deltaY = event.deltaY;
  if (event.deltaMode === 1) deltaY *= 16;
  else if (event.deltaMode === 2) deltaY *= 100;
  if (event.ctrlKey) deltaY *= 10;
  return 0.95 ** (orbitZoomSpeed * deltaY * 0.01);
}

/**
 * Scales the view zoom by `factor` while keeping the plate point under
 * `offset` (screen pixels from the view center) fixed on screen.
 * `pixelsPerUnit` is the fitted screen scale at zoom 1.
 */
export function zoomSketchViewAt(
  view: SketchView,
  factor: number,
  offset: { x: number; y: number },
  pixelsPerUnit: number,
  bounds: { width: number; depth: number },
): SketchView {
  const zoom = Math.min(SKETCH_MANUAL_MAX_ZOOM, Math.max(SKETCH_MIN_ZOOM, view.zoom * factor));
  if (!(pixelsPerUnit > 0) || zoom === view.zoom) return { zoom, pan: view.pan };
  const shift = 1 / view.zoom - 1 / zoom;
  return {
    zoom,
    pan: {
      x: Math.min(bounds.width / 2, Math.max(-bounds.width / 2, view.pan.x + (offset.x / pixelsPerUnit) * shift)),
      z: Math.min(bounds.depth / 2, Math.max(-bounds.depth / 2, view.pan.z + (offset.y / pixelsPerUnit) * shift)),
    },
  };
}
