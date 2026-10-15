import type { OcctKernel } from "occt-wasm";
import type { OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import { circularArcMidpoint } from "@/lib/sketchCircularArc";

/** One sketch outline as a closed wire in the plane y = 0: lines, circular arcs and Bezier curves. */
export function pathWire(cad: OcctKernel, path: OrderedCadSketchPath) {
  const edges = path.steps.map(({ segment, from, to }) => {
    const forward = segment.startId === from.id;
    const first = forward ? from.handleOut : from.handleIn;
    const second = forward ? to.handleIn : to.handleOut;
    if (segment.kind !== "line" && first && second) {
      // A rounded corner is a circle: build it as one (a cylinder wall), not as a free-form curve.
      const middle = circularArcMidpoint(from, first, second, to);
      if (middle) return cad.makeArcEdge({ x: from.x, y: 0, z: from.z }, { x: middle.x, y: 0, z: middle.z }, { x: to.x, y: 0, z: to.z });
      return cad.makeBezierEdge([
        { x: from.x, y: 0, z: from.z },
        { x: first.x, y: 0, z: first.z },
        { x: second.x, y: 0, z: second.z },
        { x: to.x, y: 0, z: to.z },
      ]);
    }
    return cad.makeLineEdge({ x: from.x, y: 0, z: from.z }, { x: to.x, y: 0, z: to.z });
  });
  return cad.makeWire(edges);
}
