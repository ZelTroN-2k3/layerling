import { describe, expect, it } from "vitest";
import {
  bentTubeNaturalDimensions,
  bentTubePathPieces,
  bentTubeSettings,
  bentTubeStations,
  normalizedBentTubeFields,
  type BentTubePathPiece,
  type BentTubeShapeFields,
} from "@/lib/bentTubeGeometry";
import { cadModifierProfileForShape, cadProfileSegmentCount } from "@/lib/cadProfileExtrusion";
import { validateCadProfile } from "@/lib/cadProfileSolid";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import type { BentTubeSegment, WorkplaneShape } from "@/types/layerling";

/*
 * The bent tube's exact body is its section pushed along straight runs and
 * turned through bends. These tests hold the centre line it uses against the
 * display's own stations (bentTubeStations), and the profile part against the
 * rules every exact body follows. The kernel side is tests/e2e/cadBentTube.e2e.ts.
 */

type Vec3 = [number, number, number];
const s = (length: number, bendAngle: number, bendRadius: number, roll = 0): BentTubeSegment => ({ length, bendAngle, bendRadius, roll });

function tube(fields: BentTubeShapeFields & Partial<WorkplaneShape> = {}): WorkplaneShape {
  const normalized = normalizedBentTubeFields(fields);
  const natural = bentTubeNaturalDimensions(normalized);
  return {
    id: "bent", name: "Bent tube", kind: "bentTube", x: 0, z: 0, elevation: 0, rotation: 0, color: "#888888",
    ...fields, ...normalized, width: natural.width, depth: natural.depth, height: natural.height, size: natural.size,
  } as WorkplaneShape;
}

const column = (frame: number[], index: number): Vec3 => [frame[index], frame[4 + index], frame[8 + index]];
const origin = (frame: number[]): Vec3 => [frame[3], frame[7], frame[11]];

/** Where a piece ends, by its own definition: pushed along local +Y, or turned about the axis (Rodrigues). */
function pieceEnd(piece: BentTubePathPiece): { point: Vec3; frame: Vec3[] } {
  const columns = [column(piece.frame, 0), column(piece.frame, 1), column(piece.frame, 2)];
  if (piece.kind === "straight") {
    const t = columns[1];
    const start = origin(piece.frame);
    return { point: [start[0] + t[0] * piece.length, start[1] + t[1] * piece.length, start[2] + t[2] * piece.length], frame: columns };
  }
  const rotate = (v: Vec3): Vec3 => {
    const [kx, ky, kz] = piece.axis;
    const c = Math.cos(piece.angle);
    const sn = Math.sin(piece.angle);
    const d = (kx * v[0] + ky * v[1] + kz * v[2]) * (1 - c);
    const k: Vec3 = [ky * v[2] - kz * v[1], kz * v[0] - kx * v[2], kx * v[1] - ky * v[0]];
    return [v[0] * c + k[0] * sn + kx * d, v[1] * c + k[1] * sn + ky * d, v[2] * c + k[2] * sn + kz * d];
  };
  const start = origin(piece.frame);
  const offset = rotate([start[0] - piece.center[0], start[1] - piece.center[1], start[2] - piece.center[2]]);
  return { point: [piece.center[0] + offset[0], piece.center[1] + offset[1], piece.center[2] + offset[2]], frame: columns.map(rotate) };
}

const close = (a: Vec3, b: Vec3, digits = 9) => a.forEach((value, index) => expect(value).toBeCloseTo(b[index], digits));

describe("bent tube centre line for the exact body", () => {
  const chains: BentTubeSegment[][] = [
    [s(25, 90, 15), s(25, 0, 15)],
    [s(10, 90, 12), s(10, -60, 20, 90), s(15, 0, 20)],
    [s(0, 120, 20, 37), s(20, 45, 30, -120), s(0, 180, 15, 10), s(5, 0, 15)],
  ];

  it.each(chains)("starts every piece on the display's station, frame for frame (chain %#)", (...segments) => {
    const settings = bentTubeSettings({ bentTubeSegments: segments });
    const stations = bentTubeStations(settings);
    const pieces = bentTubePathPieces(settings);
    let station = 0;
    pieces.forEach((piece) => {
      // The display places a profile point (a, b) at point + u a + v b; the frame draws it at x = b, z = a.
      const at = stations.find((candidate) => Math.hypot(...origin(piece.frame).map((value, axis) => value - candidate.point[axis])) < 1e-9);
      expect(at).toBeDefined();
      close(column(piece.frame, 0), at!.v);
      close(column(piece.frame, 1), at!.tangent);
      close(column(piece.frame, 2), at!.u);
      station += 1;
    });
    expect(station).toBe(pieces.length);
  });

  it.each(chains)("ends every piece where the next one starts, and the last at the display's last station (chain %#)", (...segments) => {
    const settings = bentTubeSettings({ bentTubeSegments: segments });
    const pieces = bentTubePathPieces(settings);
    pieces.forEach((piece, index) => {
      const end = pieceEnd(piece);
      const next = pieces[index + 1];
      if (next) {
        close(end.point, origin(next.frame));
        end.frame.forEach((axis, which) => close(axis, column(next.frame, which)));
      } else {
        const last = bentTubeStations(settings).at(-1)!;
        close(end.point, last.point);
        close(end.frame[1], last.tangent);
      }
    });
  });

  it("keeps each frame rigid and right-handed", () => {
    bentTubePathPieces(bentTubeSettings({ bentTubeSegments: chains[2] })).forEach((piece) => {
      const [a, b, c] = [0, 1, 2].map((index) => column(piece.frame, index));
      const det = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
      expect(det).toBeCloseTo(1, 12);
    });
  });
});

describe("bent tube profile part", () => {
  it("sweeps the default tube: two whole circles along straight, bend, straight", () => {
    const part = cadModifierProfileForShape(tube()) as CadModifierProfilePart;
    expect(part.kind).toBe("sweep");
    expect(part.loops).toHaveLength(2);
    part.loops.forEach((loop) => expect(loop.segments).toHaveLength(1));
    expect(part.loops[0].segments[0]).toMatchObject({ kind: "arc", rx: 5, rz: 5 });
    expect(part.loops[1].segments[0]).toMatchObject({ kind: "arc", rx: 3.5, rz: 3.5 });
    expect(part.path?.map((piece) => piece.kind)).toEqual(["straight", "bend", "straight"]);
    // 25 + quarter circle of 15 + 25.
    expect(part.height).toBeCloseTo(50 + (Math.PI / 2) * 15, 9);
    expect(() => validateCadProfile(part)).not.toThrow();
    // A sweep builds its section once per piece.
    expect(cadProfileSegmentCount(part)).toBe(6);
  });

  it("draws a polygonal section corner for corner as the display does", () => {
    const part = cadModifierProfileForShape(tube({ bentTubeProfile: "hexagon", bentTubeInnerProfile: "none", bentTubeSize: 12 })) as CadModifierProfilePart;
    expect(part.loops).toHaveLength(1);
    const loop = part.loops[0];
    expect(loop.segments).toHaveLength(6);
    // Across flats 12 mm: every corner 6 / cos 30 deg from the centre line.
    [loop, ...loop.segments].forEach((point) => expect(Math.hypot(point.x, point.z)).toBeCloseTo(6 / Math.cos(Math.PI / 6), 9));
  });

  it("keeps a round tube drawn with visibly few corners on the display mesh, like the other round shapes", () => {
    // 12 corners on 10 mm: 0.17 mm off the circle - drawn as a twelve-sided tube.
    expect(cadModifierProfileForShape(tube({ bentTubeQuality: 12 }))).toBeNull();
    // On 1 mm the same 12 corners are 0.017 mm off: round.
    expect(cadModifierProfileForShape(tube({ bentTubeQuality: 12, bentTubeSize: 1, bentTubeWall: 0.2, bentTubeSegments: [s(5, 90, 2), s(5, 0, 2)] }))?.kind).toBe("sweep");
    // A square tube has no round part; its quality only shapes the display's bends.
    expect(cadModifierProfileForShape(tube({ bentTubeQuality: 12, bentTubeProfile: "square", bentTubeInnerProfile: "square" }))?.kind).toBe("sweep");
    // A square tube with a round opening does.
    expect(cadModifierProfileForShape(tube({ bentTubeQuality: 12, bentTubeProfile: "square", bentTubeInnerProfile: "round", bentTubeSize: 20 }))).toBeNull();
  });

  it("keeps a tube that runs into itself on the display mesh", () => {
    // Four bends of 90 degrees with no straights close the ring onto itself.
    const ring = tube({ bentTubeSegments: [s(0, 90, 15), s(0, 90, 15), s(0, 90, 15), s(0, 120, 15)] });
    expect(cadModifierProfileForShape(ring)).toBeNull();
    expect(cadModifierProfileForShape(tube({ bentTubeSegments: [s(0, 90, 15), s(0, 90, 15), s(0, 90, 15)] }))?.kind).toBe("sweep");
  });

  it("refuses a centre line that is not one", () => {
    const part = cadModifierProfileForShape(tube()) as CadModifierProfilePart;
    expect(() => validateCadProfile({ ...part, path: [] })).toThrow(/no centre line/);
    const [first, ...rest] = part.path!;
    const mirrored = { ...first, frame: first.frame.map((value, index) => (index % 4 === 0 ? -value : value)) };
    expect(() => validateCadProfile({ ...part, path: [mirrored, ...rest] })).toThrow(/rigid/);
    const bend = rest[0] as Extract<NonNullable<CadModifierProfilePart["path"]>[number], { kind: "bend" }>;
    expect(() => validateCadProfile({ ...part, path: [first, { ...bend, angle: -1 }, rest[1]] })).toThrow(/bend is invalid/);
    expect(() => validateCadProfile({ ...part, path: [{ ...first, length: 0 } as typeof first, ...rest] })).toThrow(/no length/);
  });
});
