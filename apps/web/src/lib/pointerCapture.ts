/**
 * Captures a pointer for a drag. A pointer that is already gone - a touch lifted before the
 * handler ran, a pen that left the screen - makes `setPointerCapture` throw, which would stop the
 * whole handler; the drag then simply follows the pointer without the capture.
 */
export function capturePointer(element: Element | null | undefined, pointerId: number) {
  try {
    element?.setPointerCapture(pointerId);
  } catch {
    // Nothing to capture any more.
  }
}
