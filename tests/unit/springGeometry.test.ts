import { describe, expect, it } from "vitest";
import {
  createSpringGeometry,
  normalizeSpringTurns,
  normalizeSpringWire,
  springSettings,
  springTurnLimits,
} from "@/lib/springGeometry";

type Position = {
  count: number;
  getX: (index: number) => number;
  getY: (index: number) => number;
  getZ: (index: number) => number;
};

/** Jede Kante eines geschlossenen Koerpers gehoert genau zwei Dreiecken. */
function edgeUseCounts(position: Position) {
  const uses = new Map<string, number>();
  const keyForPoint = (index: number) => [position.getX(index), position.getY(index), position.getZ(index)]
    .map((value) => value.toFixed(5))
    .join(",");
  for (let index = 0; index + 2 < position.count; index += 3) {
    const triangle = [keyForPoint(index), keyForPoint(index + 1), keyForPoint(index + 2)];
    if (triangle[0] === triangle[1] || triangle[1] === triangle[2] || triangle[0] === triangle[2]) continue;
    for (let edge = 0; edge < 3; edge += 1) {
      const a = triangle[edge];
      const b = triangle[(edge + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(key, (uses.get(key) ?? 0) + 1);
    }
  }
  return uses;
}

/** Positiv heisst: die Dreiecke schauen nach aussen. */
function signedVolume(position: Position) {
  let total = 0;
  for (let index = 0; index + 2 < position.count; index += 3) {
    const ax = position.getX(index), ay = position.getY(index), az = position.getZ(index);
    const bx = position.getX(index + 1), by = position.getY(index + 1), bz = position.getZ(index + 1);
    const cx = position.getX(index + 2), cy = position.getY(index + 2), cz = position.getZ(index + 2);
    total += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  return total;
}

describe("spring geometry", () => {
  it.each([
    [20, 30, 6, 3],
    [40, 20, 2, 4],
    [12, 60, 14, 1.5],
    [30, 30, 1, 6],
  ])("wraps a closed wire in a %i x %i body with %i turns", (diameter, height, turns, wire) => {
    const geometry = createSpringGeometry({
      width: diameter,
      depth: diameter,
      height,
      springTurns: turns,
      springWire: wire,
    });
    const position = geometry.getAttribute("position") as unknown as Position;

    expect(position.count).toBeGreaterThan(500);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(signedVolume(position)).toBeGreaterThan(0);

    const box = geometry.boundingBox!;
    expect(box.max.x - box.min.x).toBeCloseTo(diameter, 2);
    expect(box.max.z - box.min.z).toBeCloseTo(diameter, 2);
    expect(box.min.y).toBeCloseTo(0, 2);
    expect(box.max.y).toBeCloseTo(height, 2);
  });

  /*
   * Druckfedern sind ueblicherweise rechtsgewickelt - so steht sie da, links auf Wunsch. Rechts steigt der Draht, wenn man
   * rechtsherum um die Hochachse geht - Daumen der rechten Hand nach +y, die
   * Finger von +z nach +x. Bis 1.32.3 lief sie andersherum, wie das Gewinde.
   * Gemessen an der Aussenseite des Drahts: Hoehe minus Vorschub ueber den
   * Winkel bleibt fuer die richtige Richtung ueberall gleich.
   */
  it.each<["right" | "left", 1 | -1]>([["right", 1], ["left", -1]])("winds %s-hand when asked", (springHand, climb) => {
    const turns = 5;
    const geometry = createSpringGeometry({ width: 20, depth: 20, height: 40, springTurns: turns, springWire: 2, springHand });
    const position = geometry.getAttribute("position") as unknown as Position;
    const radii = Array.from({ length: position.count }, (_, index) => Math.hypot(position.getX(index), position.getZ(index)));
    const outer = Math.max(...radii);
    const ys = Array.from({ length: position.count }, (_, index) => position.getY(index)).filter((_, index) => radii[index] > outer - 0.05);
    const pitch = (Math.max(...ys) - Math.min(...ys)) / turns;
    const coherence = (sign: number) => {
      let sumCos = 0;
      let sumSin = 0;
      let count = 0;
      for (let index = 0; index < position.count; index += 1) {
        if (radii[index] < outer - 0.05) continue;
        const turn = Math.atan2(position.getX(index), position.getZ(index)) / (Math.PI * 2);
        const phase = (position.getY(index) / pitch - sign * turn) * Math.PI * 2;
        sumCos += Math.cos(phase);
        sumSin += Math.sin(phase);
        count += 1;
      }
      return Math.hypot(sumCos, sumSin) / count;
    };
    expect(coherence(climb)).toBeGreaterThan(0.9);
    expect(coherence(-climb)).toBeLessThan(0.5);
    // Ohne Angabe ist sie rechtsgewickelt.
    if (springHand === "right") expect(springSettings({}, 20, 40).hand).toBe("right");
  });

  it("fills an oval footprint as well", () => {
    const geometry = createSpringGeometry({ width: 30, depth: 18, height: 25, springTurns: 5, springWire: 2.5 });
    const box = geometry.boundingBox!;
    expect(box.max.x - box.min.x).toBeCloseTo(30, 2);
    expect(box.max.z - box.min.z).toBeCloseTo(18, 2);
  });

  it("refuses more turns than fit into the height", () => {
    // Zehn Windungen aus vier Millimeter Draht brauchen mehr als zwanzig
    // Millimeter Hoehe; sonst durchdringen sie sich.
    const limits = springTurnLimits(20, 20, 4);
    expect(limits.max).toBeLessThan(10);
    expect(normalizeSpringTurns(10, 20, 20, 4)).toBe(limits.max);
    expect(normalizeSpringTurns(0, 20, 20, 4)).toBe(1);

    const tight = createSpringGeometry({ width: 20, depth: 20, height: 20, springTurns: 40, springWire: 4 });
    const position = tight.getAttribute("position") as unknown as Position;
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
  });

  it("keeps the wire inside the body", () => {
    expect(normalizeSpringWire(50, 20, 30)).toBe(8);
    expect(normalizeSpringWire(0.01, 20, 30)).toBe(0.3);
    expect(springSettings({}, 20, 30)).toEqual({ wire: 3, turns: 6, quality: 36, hand: "right" });
  });
});
