import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { projectSegmentToScreen, syncCornerRulerToolOverlay } from "@/components/workplane/ViewportOverlays";
import type { CornerRulerInstance, CornerRulerOverlayState, ThreeState } from "@/components/workplane/ViewportOverlays";
import { cornerRulerTicks } from "@/lib/rulerDimensions";

function stateFor(camera: THREE.Camera) {
  return {
    camera,
    renderer: { domElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) } },
  } as unknown as ThreeState;
}

describe("projectSegmentToScreen", () => {
  // The camera hovers above the start of a ruler arm that runs along x, looking at the arm's far end:
  // the first part of the arm lies behind it (the fan of lines in the forum, 14.10.2026).
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
  camera.position.set(0, 20, 0);
  camera.lookAt(100, 0, 0);
  const state = stateFor(camera);

  it("cuts a segment off where it passes behind the camera", () => {
    const line = projectSegmentToScreen(new THREE.Vector3(-100, 0, 0), new THREE.Vector3(100, 0, 0), state);
    expect(line).not.toBeNull();
    for (const value of [line!.x1, line!.y1, line!.x2, line!.y2]) expect(Number.isFinite(value)).toBe(true);
    // The end that lies behind the camera is not drawn where it would project (mirrored) but where the arm meets the camera plane.
    const mirrored = new THREE.Vector3(-100, 0, 0).project(camera);
    const mirroredY = ((1 - mirrored.y) / 2) * 600;
    expect(Math.abs(line!.y1 - mirroredY)).toBeGreaterThan(1);
    // The arm runs away from the camera, down towards the horizon: the cut end is lower on the screen than the far end.
    expect(line!.y1).toBeGreaterThan(line!.y2);
  });

  it("drops a segment that is wholly behind the camera", () => {
    expect(projectSegmentToScreen(new THREE.Vector3(-50, 0, 0), new THREE.Vector3(-10, 0, 0), state)).toBeNull();
  });

  it("keeps a segment that is wholly in front as it is", () => {
    const line = projectSegmentToScreen(new THREE.Vector3(20, 0, 0), new THREE.Vector3(60, 0, 0), state)!;
    const a = new THREE.Vector3(20, 0, 0).project(camera);
    expect(line.x1).toBeCloseTo(((a.x + 1) / 2) * 800, 6);
    expect(line.y1).toBeCloseTo(((1 - a.y) / 2) * 600, 6);
  });

  it("does not cut anything for a flat (orthographic) camera", () => {
    const ortho = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 1000);
    ortho.position.set(0, 20, 0);
    ortho.lookAt(100, 0, 0);
    expect(projectSegmentToScreen(new THREE.Vector3(-100, 0, 0), new THREE.Vector3(100, 0, 0), stateFor(ortho))).not.toBeNull();
  });
});

describe("the corner ruler with the camera hovering above it", () => {
  it("draws no tick that was mirrored from behind the camera", () => {
    const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
    camera.position.set(0, 15, 40);
    camera.lookAt(0, 0, -100);
    const ruler: CornerRulerInstance = {
      id: "corner-ruler-1",
      corner: { x: 0, y: 0, z: 0 },
      workplane: { kind: "base" } as unknown as CornerRulerInstance["workplane"],
      frame: { xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 1, z: 0 } },
      armLengthX: 100,
      armLengthZ: 80,
    };
    let overlay: CornerRulerOverlayState | null = null;
    syncCornerRulerToolOverlay(stateFor(camera), [ruler], [], [], { current: null }, (next) => {
      overlay = typeof next === "function" ? next(overlay) : next;
    }, "0.01" as never);
    const item = overlay!.items[0];
    const all = cornerRulerTicks(100).length + cornerRulerTicks(80).length;
    expect(item.ticks.length).toBeGreaterThan(0);
    // The part of the z arm behind the camera (z > 40) has no ticks.
    expect(item.ticks.length).toBeLessThan(all);
    for (const tick of item.ticks) {
      for (const value of [tick.x1, tick.y1, tick.x2, tick.y2]) expect(Math.abs(value)).toBeLessThan(100000);
    }
    for (const line of [item.armXLine, item.armZLine]) {
      for (const value of [line.x1, line.y1, line.x2, line.y2]) expect(Math.abs(value)).toBeLessThan(100000);
    }
  });
});
