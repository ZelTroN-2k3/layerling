import { describe, expect, it } from "vitest";
import {
  computeCornerRulerRelativeCoordinates,
  computeCornerRulerShift,
  cornerRulerFlatRotation,
  cornerRulerFrameForWorkplane,
  cornerRulerShiftVector,
  rotateCornerRulerFrame,
  cornerRulerCorner,
  cornerRulerDimensionMatches,
  cornerRulerDimensionMatchesFromCorner,
  cornerRulerTicks,
  pointAlongRuler,
  rulerDimensionMatch,
  type CornerRulerPose,
  type RulerCandidatePose,
  type RulerPose,
} from "@/lib/rulerDimensions";

function ruler(overrides: Partial<RulerPose> = {}): RulerPose {
  return { x: 0, z: 0, rotation: 0, length: 150, crossWidth: 25, ...overrides };
}

function candidate(overrides: Partial<RulerCandidatePose> = {}): RulerCandidatePose {
  return { x: 0, z: 0, rotation: 0, width: 20, height: 20, depth: 12, ...overrides };
}

describe("rulerDimensionMatch", () => {
  it("liest die Breite eines achsparallelen Koerpers direkt ab", () => {
    const match = rulerDimensionMatch(ruler(), candidate());

    expect(match).not.toBeNull();
    expect(match?.extentAlong).toBeCloseTo(20, 6);
    expect(match?.alignedField).toBe("width");
    expect(match?.alongOffset).toBeCloseTo(0, 6);
  });

  it("liest nach einer 90-Grad-Drehung die Tiefe statt der Breite ab", () => {
    const match = rulerDimensionMatch(ruler(), candidate({ rotation: 90 }));

    expect(match?.extentAlong).toBeCloseTo(12, 6);
    expect(match?.alignedField).toBe("depth");
  });

  it("zeigt bei 45 Grad nur die Randausdehnung, keine eintippbare Eigenschaft", () => {
    const match = rulerDimensionMatch(ruler(), candidate({ rotation: 45 }));
    const erwartet = 20 * Math.abs(Math.cos(Math.PI / 4)) + 12 * Math.abs(Math.sin(Math.PI / 4));

    expect(match?.alignedField).toBeNull();
    expect(match?.extentAlong).toBeCloseTo(erwartet, 6);
  });

  it("ignoriert einen Koerper ausserhalb des Lineal-Bandes", () => {
    const match = rulerDimensionMatch(ruler({ crossWidth: 25 }), candidate({ z: 50 }));

    expect(match).toBeNull();
  });

  it("folgt der eigenen Drehung des Lineals", () => {
    const gedreht = ruler({ rotation: 90 });
    const match = rulerDimensionMatch(gedreht, candidate());

    // Ungedreht steht die Tiefe des Koerpers jetzt parallel zur gedrehten Lineal-Achse.
    expect(match?.alignedField).toBe("depth");
    expect(match?.extentAlong).toBeCloseTo(12, 6);
  });

  it("misst den Versatz entlang der Achse, nicht die Weltkoordinate", () => {
    const match = rulerDimensionMatch(ruler(), candidate({ x: 40 }));

    expect(match?.alongOffset).toBeCloseTo(40, 6);
  });
});

describe("pointAlongRuler", () => {
  it("laeuft bei Drehung 0 entlang der Weltachse X", () => {
    const punkt = pointAlongRuler(ruler({ x: 5, z: 5 }), 30);

    expect(punkt.x).toBeCloseTo(35, 6);
    expect(punkt.z).toBeCloseTo(5, 6);
  });

  it("folgt einer 90-Grad-Drehung des Lineals", () => {
    const punkt = pointAlongRuler(ruler({ rotation: 90 }), 30);

    expect(punkt.x).toBeCloseTo(0, 6);
    expect(punkt.z).toBeCloseTo(-30, 6);
  });
});

function cornerPose(overrides: Partial<CornerRulerPose> = {}): CornerRulerPose {
  return { x: 0, z: 0, rotation: 0, armLengthX: 100, armLengthZ: 80, armWidth: 12, ...overrides };
}

describe("cornerRulerCorner", () => {
  it("liegt bei Drehung 0 eine halbe Armlaenge je Achse von der Mitte entfernt", () => {
    const corner = cornerRulerCorner(cornerPose());

    expect(corner.x).toBeCloseTo(-50, 6);
    expect(corner.z).toBeCloseTo(-40, 6);
  });

  it("folgt der eigenen Drehung der Form", () => {
    const corner = cornerRulerCorner(cornerPose({ rotation: 90 }));

    expect(corner.x).toBeCloseTo(-40, 6);
    expect(corner.z).toBeCloseTo(50, 6);
  });
});

describe("cornerRulerDimensionMatches", () => {
  it("erkennt einen Nachbarn nur am Arm, in dessen Band er liegt", () => {
    const nearArmX = cornerRulerDimensionMatches(cornerPose(), candidate({ x: 10, z: -40 }));

    expect(nearArmX.armX).not.toBeNull();
    expect(nearArmX.armX?.extentAlong).toBeCloseTo(20, 6);
    expect(nearArmX.armZ).toBeNull();
  });

  it("erkennt denselben Nachbarn am anderen Arm, wenn er dort liegt", () => {
    const nearArmZ = cornerRulerDimensionMatches(cornerPose(), candidate({ x: -50, z: 10 }));

    expect(nearArmZ.armX).toBeNull();
    expect(nearArmZ.armZ).not.toBeNull();
    expect(nearArmZ.armZ?.extentAlong).toBeCloseTo(12, 6);
  });

  it("meldet keinen Treffer, wenn der Nachbar zu weit von beiden Armen absteht", () => {
    const weitWeg = cornerRulerDimensionMatches(cornerPose(), candidate({ x: 200, z: 200 }));

    expect(weitWeg.armX).toBeNull();
    expect(weitWeg.armZ).toBeNull();
  });
});

describe("cornerRulerDimensionMatchesFromCorner", () => {
  it("liefert dasselbe Ergebnis wie cornerRulerDimensionMatches, wenn die Ecke direkt vorliegt", () => {
    const pose = cornerPose();
    const corner = cornerRulerCorner(pose);
    const viaCenter = cornerRulerDimensionMatches(pose, candidate({ x: 10, z: -40 }));
    const viaCornerDirekt = cornerRulerDimensionMatchesFromCorner(corner, pose.rotation, pose.armLengthX, pose.armLengthZ, pose.armWidth, candidate({ x: 10, z: -40 }));

    expect(viaCornerDirekt.armX?.extentAlong).toBeCloseTo(viaCenter.armX?.extentAlong ?? NaN, 6);
    expect(viaCornerDirekt.armZ).toBeNull();
    expect(viaCenter.armZ).toBeNull();
  });
});

describe("cornerRulerTicks", () => {
  it("erzeugt einen Teilstrich je Millimeter, einschliesslich beider Enden", () => {
    const ticks = cornerRulerTicks(10);

    expect(ticks).toHaveLength(11);
    expect(ticks[0]).toEqual({ offset: 0, isTen: true, isFive: true });
    expect(ticks[10]).toEqual({ offset: 10, isTen: true, isFive: true });
  });

  it("markiert Fuenfer- und Zehner-Teilstriche richtig", () => {
    const ticks = cornerRulerTicks(12);

    expect(ticks.find((tick) => tick.offset === 5)).toMatchObject({ isFive: true, isTen: false });
    expect(ticks.find((tick) => tick.offset === 7)).toMatchObject({ isFive: false, isTen: false });
    expect(ticks.find((tick) => tick.offset === 12)).toMatchObject({ isFive: false, isTen: false });
  });

  it("liefert nur den Nullstrich fuer eine Laenge von 0", () => {
    const ticks = cornerRulerTicks(0);

    expect(ticks).toEqual([{ offset: 0, isTen: true, isFive: true }]);
  });
});

describe("computeCornerRulerRelativeCoordinates", () => {
  const bounds = {
    min: { x: 10, y: 5, z: 5 },
    max: { x: 16.5, y: 15, z: 11.5 },
  };

  it("berechnet im Eckpunkt-Modus die minimale Ecke", () => {
    const coords = computeCornerRulerRelativeCoordinates({
      rulerCorner: { x: 0, y: 0, z: 0 },
      rulerRotation: 0,
      mode: "endpoint",
      bounds,
    });

    expect(coords.x).toBeCloseTo(10, 6);
    expect(coords.z).toBeCloseTo(5, 6);
    expect(coords.elevation).toBeCloseTo(5, 6);
    expect(coords.xEndpointOnAxis).toEqual({ x: 10, y: 0, z: 0 });
    expect(coords.zEndpointOnAxis).toEqual({ x: 0, y: 0, z: 5 });
  });

  it("berechnet im Mittelpunkt-Modus das Zentrum", () => {
    const coords = computeCornerRulerRelativeCoordinates({
      rulerCorner: { x: 0, y: 0, z: 0 },
      rulerRotation: 0,
      mode: "midpoint",
      bounds,
    });

    expect(coords.x).toBeCloseTo(13.25, 6);
    expect(coords.z).toBeCloseTo(8.25, 6);
    expect(coords.elevation).toBeCloseTo(10, 6);
    expect(coords.xEndpointOnAxis).toEqual({ x: 13.25, y: 0, z: 0 });
    expect(coords.zEndpointOnAxis).toEqual({ x: 0, y: 0, z: 8.25 });
  });

  it("folgt einer 90-Grad-Drehung des Lineals", () => {
    const coords = computeCornerRulerRelativeCoordinates({
      rulerCorner: { x: 20, y: 0, z: 30 },
      rulerRotation: 90,
      mode: "endpoint",
      bounds,
    });

    expect(coords.x).toBeCloseTo(10, 6);
    expect(coords.z).toBeCloseTo(5, 6);
    // Bei 90 Grad zeigt axisX nach (0, 0, -1) und axisZ nach (1, 0, 0)
    expect(coords.axisXDirection.x).toBeCloseTo(0, 5);
    expect(coords.axisXDirection.z).toBeCloseTo(-1, 5);
    expect(coords.axisZDirection.x).toBeCloseTo(1, 5);
    expect(coords.axisZDirection.z).toBeCloseTo(0, 5);
  });
});

describe("framing square on any workplane (#105)", () => {
  const plate = { xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 1, z: 0 } };
  // A face facing the viewer (+z): x runs right, z runs down the face.
  const wall = { xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: -1, z: 0 }, normal: { x: 0, y: 0, z: 1 } };

  it("starts on the plate turned to 90 degrees, as it always has", () => {
    const frame = cornerRulerFrameForWorkplane(plate);
    expect(frame.xAxis.x).toBeCloseTo(0, 6);
    expect(frame.xAxis.z).toBeCloseTo(-1, 6);
    expect(frame.zAxis.x).toBeCloseTo(1, 6);
    expect(cornerRulerFlatRotation(frame)).toBeCloseTo(90, 6);
  });

  it("turns a quarter about the normal per click and comes back after four", () => {
    let frame = cornerRulerFrameForWorkplane(wall);
    const start = frame;
    for (let turn = 0; turn < 4; turn += 1) {
      frame = rotateCornerRulerFrame(frame);
      expect(frame.normal).toEqual(wall.normal);
      expect(frame.xAxis.z).toBeCloseTo(0, 6);
      expect(frame.zAxis.z).toBeCloseTo(0, 6);
    }
    expect(frame.xAxis.x).toBeCloseTo(start.xAxis.x, 6);
    expect(frame.xAxis.y).toBeCloseTo(start.xAxis.y, 6);
  });

  it("measures on a wall along the wall and its height along the normal", () => {
    // Corner at the wall's top left; the shape's box in the frame's own axes.
    const coords = computeCornerRulerRelativeCoordinates({
      rulerCorner: { x: 0, y: 200, z: 10 },
      rulerRotation: 0,
      frame: wall,
      mode: "midpoint",
      bounds: { min: { x: 30, y: -5, z: 180 }, max: { x: 50, y: 5, z: 200 } },
    });
    expect(coords.x).toBeCloseTo(40, 6);
    expect(coords.z).toBeCloseTo(190, 6);
    expect(coords.elevation).toBeCloseTo(0, 6);
    expect(coords.xEndpointOnAxis).toEqual({ x: 40, y: 200, z: 10 });
    expect(coords.zEndpointOnAxis.y).toBeCloseTo(10, 6);
  });

  it("moves shapes along the frame's own directions", () => {
    expect(cornerRulerShiftVector(wall, "x", 5)).toEqual({ x: 5, y: 0, z: 0 });
    expect(cornerRulerShiftVector(wall, "z", 5)).toEqual({ x: 0, y: -5, z: 0 });
    expect(cornerRulerShiftVector(wall, "elevation", 2)).toEqual({ x: 0, y: 0, z: 2 });
    expect(cornerRulerShiftVector(plate, "elevation", 3)).toEqual({ x: 0, y: 3, z: 0 });
  });

  it("keeps the arm measurements to the plate", () => {
    expect(cornerRulerFlatRotation(cornerRulerFrameForWorkplane(wall))).toBeNull();
    expect(cornerRulerFlatRotation({ ...plate, normal: { x: 0, y: -1, z: 0 } })).toBeNull();
    expect(cornerRulerFlatRotation(rotateCornerRulerFrame(cornerRulerFrameForWorkplane(plate)))).toBeCloseTo(180, 6);
  });
});

describe("computeCornerRulerShift", () => {
  it("verschiebt bei Drehung 0 entlang Welt-X bzw. Welt-Z", () => {
    const shiftX = computeCornerRulerShift(0, "x", 15);
    expect(shiftX.x).toBeCloseTo(15, 6);
    expect(shiftX.z).toBeCloseTo(0, 6);

    const shiftZ = computeCornerRulerShift(0, "z", -8);
    expect(shiftZ.x).toBeCloseTo(0, 6);
    expect(shiftZ.z).toBeCloseTo(-8, 6);
  });

  it("verschiebt bei Drehung 90 entlang der rotierten Achsen", () => {
    const shiftX = computeCornerRulerShift(90, "x", 10);
    expect(shiftX.x).toBeCloseTo(0, 5);
    expect(shiftX.z).toBeCloseTo(-10, 5);

    const shiftZ = computeCornerRulerShift(90, "z", 10);
    expect(shiftZ.x).toBeCloseTo(10, 5);
    expect(shiftZ.z).toBeCloseTo(0, 5);
  });
});

