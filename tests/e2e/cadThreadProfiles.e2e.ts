import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierThreadForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { threadPartSolid } from "@/lib/threadSolid";
import { createThreadGeometry, threadNaturalFootprint, threadNaturalHeight, threadProfileShape, threadSettings, MIN_THREAD_QUALITY, WHITWORTH_PROFILE_CONSTANTS } from "@/lib/threadGeometry";
import { meshYawDegrees, mirrorSign } from "@/lib/workplaneShapes";
import { cad, thread, displayMesh, body, triangles, inside } from "./helpers/threadHarness";
import type { Vec3 } from "./helpers/threadHarness";

describe("the thread's profile in the exact body", () => {
  /*
   * The flank test above stands 0.06 pitch off the drawn surface, too far to
   * see the profile's shape: a Whitworth arc of half again its radius passed
   * it. Here the profile itself, in the half plane through +x where every
   * rod has a crest at its shaft bottom, a pitch at a time: points 0.002
   * pitch inside and outside it. The Whitworth body takes the true arcs, which
   * the drawn chords stray from by 0.0013 pitch; the other profiles take the
   * drawn points.
   */
  const profileCases: Array<[string, Partial<WorkplaneShape>]> = [
    ["V", {}],
    ["V, left hand", { threadHand: "left" }],
    ["trapezoidal", { threadProfile: "trapezoidal", threadDiameter: 10, threadPitch: 2, height: 24 }],
    ["round", { threadProfile: "round", threadDiameter: 10, threadPitch: 2, height: 24 }],
    ["Whitworth", { threadProfile: "whitworth", threadDiameter: 20.955, threadPitch: 25.4 / 14, height: 30 }],
  ];

  it.each(profileCases)("follows the %s profile within 0.002 pitch", (_name, extra) => {
    const shape = thread(extra);
    const part = cadModifierThreadForShape(shape)!;
    const solid = threadPartSolid(cad, part);
    const { pitch, major, minor } = part;
    const settings = threadSettings(shape);
    // Pieces of one pitch from the crest, as (radius, height above it) at t in [0, 1], with the outward normal.
    type Piece = (t: number) => { r: number; y: number; nr: number; ny: number };
    const pieces: Piece[] = [];
    const line = (a: [number, number], b: [number, number]): Piece => (t) => {
      const dr = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dr, dy);
      return { r: a[0] + dr * t, y: a[1] + dy * t, nr: dy / length, ny: -dr / length };
    };
    expect(part.curve?.kind).toBe(settings.profile === "whitworth" ? "whitworth" : undefined);
    if (settings.profile === "whitworth") {
      const radius = WHITWORTH_PROFILE_CONSTANTS.radiusPerPitch * pitch;
      const arcEnd = Math.PI / 2 - ((WHITWORTH_PROFILE_CONSTANTS.flankAngleDegrees / 2) * Math.PI) / 180;
      // Crest arcs bulge outwards from their centre, the root arc inwards to its own.
      const arc = (cr: number, cy: number, from: number, to: number, sign: 1 | -1): Piece => (t) => {
        const angle = from + (to - from) * t;
        return { r: cr + sign * radius * Math.cos(angle), y: cy + radius * Math.sin(angle), nr: sign * Math.cos(angle), ny: sign * Math.sin(angle) };
      };
      const root = (angle: number): [number, number] => [minor + radius - radius * Math.cos(angle), pitch / 2 + radius * Math.sin(angle)];
      const crest = (cy: number, angle: number): [number, number] => [major - radius + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
      pieces.push(arc(major - radius, 0, 0, arcEnd, 1), line(crest(0, arcEnd), root(-arcEnd)));
      const rootArc: Piece = (t) => {
        const angle = -arcEnd + 2 * arcEnd * t;
        return { r: minor + radius - radius * Math.cos(angle), y: pitch / 2 + radius * Math.sin(angle), nr: Math.cos(angle), ny: -Math.sin(angle) };
      };
      pieces.push(rootArc, line(root(arcEnd), crest(pitch, -arcEnd)), arc(major - radius, pitch, -arcEnd, 0, 1));
    } else {
      const points = threadProfileShape(settings.profile).points.map((point): [number, number] => [minor + (major - minor) * point.level, point.u * pitch]);
      points.push([points[0][0], pitch]);
      for (let index = 0; index + 1 < points.length; index += 1) pieces.push(line(points[index], points[index + 1]));
    }
    const offset = 0.002 * pitch;
    const base = part.shaftBottom + Math.round((part.height - part.shaftBottom) / 2 / pitch) * pitch;
    let tested = 0;
    for (const piece of pieces) {
      for (const t of [0.2, 0.5, 0.8]) {
        const p = piece(t);
        const at = (sign: number) => ({ x: p.r + sign * offset * p.nr, y: base + p.y + sign * offset * p.ny, z: 0 });
        expect(cad.containsPoint(solid, at(-1), 1e-7)).toBe(true);
        expect(cad.containsPoint(solid, at(1), 1e-7)).toBe(false);
        tested += 1;
      }
    }
    expect(tested).toBeGreaterThanOrEqual(9);
  });
});
