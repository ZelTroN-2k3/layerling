
import { Crosshair, Plus, Rows3, X } from "lucide-react";
import { useLayoutEffect, useRef, useState, type Dispatch, type MutableRefObject, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import * as THREE from "three";
import { disposeBoundsTree } from "three-mesh-bvh";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { type AppThemePalette, type ResolvedAppTheme } from "@/lib/appTheme";
import { t } from "@/lib/i18n";
import { displayToMillimeters, formatLengthMm, formatMeasurementNumber, lengthDisplayUnit, millimetersToDisplay, parseMeasurementInput } from "@/lib/measurementUnits";
import { computeCornerRulerRelativeCoordinates, cornerRulerDimensionMatchesFromCorner, cornerRulerFlatRotation, cornerRulerTicks, pointAlongRuler, rulerDimensionMatch, type CornerRulerFrame, type CornerRulerMode, type RulerDimensionField, type RulerDimensionMatch } from "@/lib/rulerDimensions";
import { type PlacementPoint, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { capturePointer } from "@/lib/pointerCapture";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { displayY, insideZ } from "@/lib/displayAxes";
import { isNonSolidShapeKind, preservesEdgeTreatmentSize, resizedImportedMeshPositions, shapeDepth, shapeExtrudeDeformAt, shapeHasExtrudeDeform, shapeHasTaper, shapeOverallFootprintDimensions, shapeTaperScaleAt, shapeWidth } from "@/lib/workplaneShapes";
import { type RotationAxis } from "@/components/workplane/TransformOverlay";
import { type AlignAxes, type FrameCuboid } from "@/lib/alignFrame";
import type { MeasurementAccuracy, WorkplaneNote, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { NOTE_TEXT_LIMIT } from "@/lib/workplaneNotes";

/** Light-blue chrome for origin-distance lines, matching `.origin-dimension-value`. */
const ORIGIN_DIMENSION_LINE_COLOR = { light: "#6ec4e8", dark: "#8fd4f0" } as const;

/** Kreuzbreite und Vorgabe-Armlaengen des Winkellineal-Werkzeugs - kein Formen-Katalog-Eintrag mehr, siehe layerling-lineal.md. */
const CORNER_RULER_ARM_WIDTH = 12;

export const RENDER_LAYER_HELPERS = 2;

const MAX_SHARED_SHAPE_GEOMETRIES = 192;

const MAX_SHARED_SHAPE_MATERIALS = 128;

export const sharedShapeGeometryCache = new Map<string, { geometry: THREE.BufferGeometry; users: number }>();

export const sharedEdgesGeometryCache = new WeakMap<THREE.BufferGeometry, Map<number, THREE.EdgesGeometry>>();

export const sharedShapeMaterialCache = new Map<string, { material: THREE.MeshStandardMaterial; users: number }>();

export type PointCardOffset = { x: number; y: number };

export type ShapeRenderRecord = {
  object: THREE.Group;
  shape: WorkplaneShape;
  transformSignature: string;
  materialSignature: string;
  geometrySignature: string;
  selected: boolean;
};

export type ThreeState = {
  /** How far the orbit pivot may travel (the plate), as the camera clamp last saw it; the wheel zoom stays within it. */
  pivotLimits?: { halfWidth: number; halfDepth: number };
  /** Colour set on top of light/dark; only the canvas reads it. */
  palette?: AppThemePalette;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  controls: OrbitControls;
  workplaneLayer: THREE.Group;
  workplanePreviewLayer: THREE.Group;
  /** The face "Lay flat" would turn down, drawn while the pointer is over it. */
  layFlatHoverLayer?: THREE.Group;
  /** The bent-tube segment the settings are about, drawn over the tube. */
  bentTubeSegmentLayer?: THREE.Group;
  shapeLayer: THREE.Group;
  helperLayer: THREE.Group;
  splitLayer: THREE.Group;
  transformGuideLayer: THREE.Group;
  moveDimensionLayer: THREE.Group;
  originDimensionLayer: THREE.Group;
  modifierLayer: THREE.Group;
  shapeRecords: Map<string, ShapeRenderRecord>;
  /** The pivot the user set for rotating; the rotation wheels sit on its axes. */
  rotationPivot?: THREE.Vector3 | null;
  officialShapeLayerActive: boolean;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  dragPlane: THREE.Plane;
  animationId: number;
  needsRender: boolean;
  wasCameraMoving: boolean;
  lastOverlaySync: number;
  lastViewCubeSync: number;
  /** True while a handle of the align tool shows its preview: the drawn parts have moved then (#235). */
  alignPreviewActive?: boolean;
  /** The axes and box the align handles stand on along a set workplane (#232). */
  alignFrameInfo?: { axes: AlignAxes; bounds: FrameCuboid } | null;
  /** The box of the parts the align handles stand on, from before a preview moved them. */
  alignBoundsCache?: { key: string; shapes: WorkplaneShape[]; bounds: THREE.Box3 | null };
  rotationHandleSides: RotationHandleSides | null;
  sectionPlane: THREE.Plane | null;
  sectionPlaneHelper: THREE.Group | null;
  /** The scene's lights, so the settings can change how punchy the shading is. */
  lights: { ambient: THREE.HemisphereLight; key: THREE.DirectionalLight; fill: THREE.DirectionalLight };
  disposeInteractionListeners: () => void;
  resize: () => void;
};

export type MoveDimensionSession = {
  active: boolean;
  originX: number;
  originZ: number;
  planeY: number;
  deltaX: number;
  deltaZ: number;
  items: Array<Pick<DragItem, "id" | "startX" | "startZ">>;
};

/** Breite einer offenen Notizkarte samt Nadel und Abstand, in Bildpunkten. */
const NOTE_CARD_REACH = 260;

/** Weiter waechst das Textfeld nicht mit; darueber hinaus wird darin gerollt. */
const NOTE_TEXT_MAX_HEIGHT = 168;

type NoteOverlayItem = {
  id: string;
  index: number;
  text: string;
  collapsed: boolean;
  attached: boolean;
  /** A reference point, not a note: shown as a mark with its coordinates. */
  point: boolean;
  x: number;
  y: number;
  z: number;
  screenX: number;
  screenY: number;
  behind: boolean;
  /** Am rechten Rand oeffnet die Karte nach links, sonst stuende sie ausserhalb. */
  flipped: boolean;
};

export type NoteOverlayState = {
  notes: NoteOverlayItem[];
};

export type TapePoint = {
  id: string;
  x: number;
  y: number;
  z: number;
  attachment?: TapeAttachment;
};

export type TapeAttachment = {
  shapeId: string;
  normalized: [number, number, number];
  kind?: "vertex" | "edge" | "surface";
  topologyKey?: string;
};

export type TapeEdgeAttachment = {
  key: string;
  shapeId: string;
  normalizedPoints: Array<[number, number, number]>;
  topologyKey?: string;
};

type TapeSegment = {
  id: string;
  startId: string;
  endId: string;
  edge?: TapeEdgeAttachment;
};

export type TapeModel = {
  points: TapePoint[];
  segments: TapeSegment[];
  startPointId: string | null;
  /** The edge the first point lies on, while a measurement is under way: the diameter of a circle snaps from it (#308). */
  startEdge?: TapeEdgeAttachment | null;
  hover: TapeCandidate | null;
};

export type TapeOverlayState = {
  points: Array<TapePoint & { screenX: number; screenY: number }>;
  segments: Array<TapeSegment & { x1: number; y1: number; x2: number; y2: number; screenPoints?: string; labelX: number; labelY: number; label: string }>;
  hover: { screenX: number; screenY: number; edgeScreenPoints?: string } | null;
};

export type TapeCandidate = {
  x: number;
  y: number;
  z: number;
  pointId?: string;
  attachment?: TapeAttachment;
  /** Set when a click would measure this whole edge. */
  edge?: TapeEdgeAttachment;
  /** The edge the point lies on, whether or not a click measures all of it. */
  circleEdge?: TapeEdgeAttachment;
};

export type RotationHandleSide = "near" | "right" | "far" | "left";

export type RotationHandleSides = Record<RotationAxis, RotationHandleSide>;

export type DragItem = {
  id: string;
  startX: number;
  startZ: number;
  startElevation: number;
  nextX: number;
  nextZ: number;
  nextElevation: number;
  startVisualY: number;
  visual: THREE.Object3D | null;
  helper: THREE.Box3Helper | null;
  helperBox: THREE.Box3 | null;
  hadPreviewSimplified: boolean;
};

export function quaternionForShape(shape: WorkplaneShape) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(shape.rotation),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
}

export function projectToScreen(point: THREE.Vector3, state: ThreeState) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.camera.updateMatrixWorld();
  const projected = point.clone().project(state.camera);
  return {
    x: ((projected.x + 1) / 2) * rect.width,
    y: ((1 - projected.y) / 2) * rect.height,
  };
}

export function syncMoveDimensionWorldLines(
  state: ThreeState,
  session: MoveDimensionSession | null,
  theme: ResolvedAppTheme,
) {
  const layer = state.moveDimensionLayer;
  const signature = session
    ? [session.originX, session.originZ, session.planeY, session.deltaX, session.deltaZ, theme].join(":")
    : "";
  if (layer.userData.moveDimensionSignature === signature) {
    return;
  }
  layer.userData.moveDimensionSignature = signature;
  disposeChildren(layer);
  if (!session || (Math.abs(session.deltaX) < 1e-9 && Math.abs(session.deltaZ) < 1e-9)) {
    state.needsRender = true;
    return;
  }

  const y = session.planeY;
  const origin = new THREE.Vector3(session.originX, y, session.originZ);
  const xEnd = new THREE.Vector3(session.originX + session.deltaX, y, session.originZ);
  const zEnd = new THREE.Vector3(session.originX, y, session.originZ + session.deltaZ);
  const current = new THREE.Vector3(session.originX + session.deltaX, y, session.originZ + session.deltaZ);
  const solidColor = theme === "dark" ? "#f1f8fc" : "#111a21";
  const guideColor = theme === "dark" ? "#b8c9d2" : "#65737c";
  const solidPoints: number[] = [];
  const guidePoints: number[] = [];

  const addSegment = (points: number[], start: THREE.Vector3, end: THREE.Vector3) => {
    points.push(start.x, start.y, start.z, end.x, end.y, end.z);
  };
  const addWideSegments = (points: number[], color: string, linewidth: number, opacity: number, renderOrder: number) => {
    if (points.length === 0) {
      return;
    }
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(points);
    const material = new LineMaterial({
      color,
      linewidth,
      worldUnits: false,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      alphaToCoverage: false,
    });
    material.toneMapped = false;
    const rect = state.renderer.domElement.getBoundingClientRect();
    material.resolution.set(Math.max(1, rect.width), Math.max(1, rect.height));
    const lines = new LineSegments2(geometry, material);
    lines.renderOrder = renderOrder;
    lines.frustumCulled = false;
    setObjectRenderLayer(lines, RENDER_LAYER_HELPERS);
    layer.add(lines);
  };
  const addArrow = (endpoint: THREE.Vector3, axisX: number, axisZ: number, movement: number) => {
    const direction = new THREE.Vector3(axisX * Math.sign(movement), 0, axisZ * Math.sign(movement));
    const arrowLength = Math.min(1.1, Math.max(0.26, Math.abs(movement) * 0.5));
    const arrowWidth = arrowLength * 0.72;
    const base = endpoint.clone().addScaledVector(direction, -arrowLength);
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(arrowWidth / 2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([
        endpoint.x, endpoint.y, endpoint.z,
        base.x + perpendicular.x, base.y, base.z + perpendicular.z,
        base.x - perpendicular.x, base.y, base.z - perpendicular.z,
      ], 3),
    );
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: solidColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    });
    arrowMaterial.toneMapped = false;
    const arrow = new THREE.Mesh(geometry, arrowMaterial);
    arrow.renderOrder = 1002;
    arrow.frustumCulled = false;
    setObjectRenderLayer(arrow, RENDER_LAYER_HELPERS);
    layer.add(arrow);
  };

  if (Math.abs(session.deltaX) >= 1e-9) {
    const overrun = Math.min(2, Math.max(0.5, Math.abs(session.deltaX) * 0.15));
    const start = origin.clone().add(new THREE.Vector3(-Math.sign(session.deltaX) * overrun, 0, 0));
    addSegment(solidPoints, start, xEnd);
    addSegment(guidePoints, xEnd, current);
    addArrow(xEnd, 1, 0, session.deltaX);
  }
  if (Math.abs(session.deltaZ) >= 1e-9) {
    const overrun = Math.min(2, Math.max(0.5, Math.abs(session.deltaZ) * 0.15));
    const start = origin.clone().add(new THREE.Vector3(0, 0, -Math.sign(session.deltaZ) * overrun));
    addSegment(solidPoints, start, zEnd);
    addSegment(guidePoints, zEnd, current);
    addArrow(zEnd, 0, 1, session.deltaZ);
  }

  addWideSegments(solidPoints, solidColor, 1.45, 1, 1001);
  addWideSegments(guidePoints, guideColor, 1.05, 0.72, 1000);
  state.needsRender = true;
}

export function syncTransformGuideWorldLines(
  state: ThreeState,
  segments: Array<readonly [THREE.Vector3, THREE.Vector3]> | null,
  theme: ResolvedAppTheme,
) {
  const layer = state.transformGuideLayer;
  const signature = segments
    ? [
        theme,
        ...segments.flatMap(([start, end]) => [start.x, start.y, start.z, end.x, end.y, end.z]),
      ].join(":")
    : "";
  if (layer.userData.transformGuideSignature === signature) {
    return;
  }

  layer.userData.transformGuideSignature = signature;
  disposeChildren(layer);
  if (!segments || segments.length === 0) {
    state.needsRender = true;
    return;
  }

  const positions = segments.flatMap(([start, end]) => [start.x, start.y, start.z, end.x, end.y, end.z]);
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  const material = new LineMaterial({
    color: theme === "dark" ? "#cfe1ea" : "#1f272e",
    linewidth: 1.15,
    worldUnits: false,
    dashed: true,
    dashSize: 0.625,
    gapSize: 0.625,
    transparent: true,
    opacity: theme === "dark" ? 0.86 : 0.72,
    // Bodies hide the guides: the footprint lies under the selected body and must not shine
    // through it or through its neighbours (#219).
    depthTest: true,
    depthWrite: false,
    alphaToCoverage: false,
  });
  material.toneMapped = false;
  const rect = state.renderer.domElement.getBoundingClientRect();
  material.resolution.set(Math.max(1, rect.width), Math.max(1, rect.height));
  const lines = new LineSegments2(geometry, material);
  lines.computeLineDistances();
  lines.renderOrder = 999;
  lines.frustumCulled = false;
  setObjectRenderLayer(lines, RENDER_LAYER_HELPERS);
  freezeStaticObjectMatrices(lines);
  layer.add(lines);
  state.needsRender = true;
}

export function tapeShapeDimensions(object: THREE.Object3D) {
  const dimensions = object.userData.tapeDimensions as [number, number, number] | undefined;
  return dimensions ?? [1, 1, 1];
}

function tapeAttachmentWorld(state: ThreeState, attachment: TapeAttachment) {
  const object = findShapeObject(state, attachment.shapeId);
  if (!object) return null;
  const dimensions = tapeShapeDimensions(object);
  return object.localToWorld(new THREE.Vector3(
    attachment.normalized[0] * dimensions[0],
    attachment.normalized[1] * dimensions[1],
    attachment.normalized[2] * dimensions[2],
  ));
}

export function tapePointWorld(state: ThreeState, point: Pick<TapePoint, "x" | "y" | "z" | "attachment">) {
  return point.attachment ? tapeAttachmentWorld(state, point.attachment) ?? new THREE.Vector3(point.x, point.y, point.z) : new THREE.Vector3(point.x, point.y, point.z);
}

export function tapeEdgeWorldPoints(state: ThreeState, edge: TapeEdgeAttachment) {
  return edge.normalizedPoints.flatMap((normalized) => {
    const world = tapeAttachmentWorld(state, { shapeId: edge.shapeId, normalized });
    return world ? [world] : [];
  });
}

/** The points a measurement runs along: its whole edge, or the straight line between its two points. */
export function tapeSegmentWorldPoints(state: ThreeState, model: TapeModel, segmentId: string) {
  const segment = model.segments.find((candidate) => candidate.id === segmentId);
  if (!segment) return [];
  const edgePoints = segment.edge ? tapeEdgeWorldPoints(state, segment.edge) : [];
  if (edgePoints.length >= 2) return edgePoints;
  const start = model.points.find((point) => point.id === segment.startId);
  const end = model.points.find((point) => point.id === segment.endId);
  return start && end ? [tapePointWorld(state, start), tapePointWorld(state, end)] : [];
}

function tapePolylineLength(points: THREE.Vector3[]) {
  let length = 0;
  for (let index = 0; index + 1 < points.length; index += 1) length += points[index].distanceTo(points[index + 1]);
  return length;
}

function tapePolylineMidpoint(points: THREE.Vector3[]) {
  if (points.length === 0) return new THREE.Vector3();
  const half = tapePolylineLength(points) / 2;
  let traversed = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const length = points[index].distanceTo(points[index + 1]);
    if (traversed + length >= half && length > 1e-9) return points[index].clone().lerp(points[index + 1], (half - traversed) / length);
    traversed += length;
  }
  return points[points.length - 1].clone();
}

function tapeScreenPointList(points: THREE.Vector3[], state: ThreeState) {
  return points.map((point) => {
    const screen = projectToScreen(point, state);
    return `${screen.x},${screen.y}`;
  }).join(" ");
}

export function syncTapeOverlay(
  state: ThreeState,
  model: TapeModel,
  overlayRef: MutableRefObject<TapeOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<TapeOverlayState | null>>,
  accuracy: MeasurementAccuracy,
) {
  const projectedPoints = new Map<string, { screenX: number; screenY: number }>();
  const points = model.points.map((point) => {
    const screen = projectToScreen(tapePointWorld(state, point), state);
    const projected = { screenX: screen.x, screenY: screen.y };
    projectedPoints.set(point.id, projected);
    return { ...point, ...projected };
  });
  const segments = model.segments.flatMap((segment) => {
    const start = model.points.find((point) => point.id === segment.startId);
    const end = model.points.find((point) => point.id === segment.endId);
    const startScreen = projectedPoints.get(segment.startId);
    const endScreen = projectedPoints.get(segment.endId);
    if (!start || !end || !startScreen || !endScreen) {
      return [];
    }
    const startWorld = tapePointWorld(state, start);
    const endWorld = tapePointWorld(state, end);
    const attachedEdgePoints = segment.edge ? tapeEdgeWorldPoints(state, segment.edge) : [];
    const worldPoints = attachedEdgePoints.length >= 2 ? attachedEdgePoints : [startWorld, endWorld];
    const labelScreen = projectToScreen(tapePolylineMidpoint(worldPoints), state);
    return [
      {
        ...segment,
        x1: startScreen.screenX,
        y1: startScreen.screenY,
        x2: endScreen.screenX,
        y2: endScreen.screenY,
        screenPoints: segment.edge && worldPoints.length >= 2 ? tapeScreenPointList(worldPoints, state) : undefined,
        labelX: labelScreen.x,
        labelY: labelScreen.y - 18,
        label: formatMeasure(tapePolylineLength(worldPoints), accuracy),
      },
    ];
  });
  const hoverWorld = model.hover ? tapePointWorld(state, model.hover) : null;
  const hoverScreen = hoverWorld ? projectToScreen(hoverWorld, state) : null;
  const hoverEdgePoints = model.hover?.edge ? tapeEdgeWorldPoints(state, model.hover.edge) : [];
  const next: TapeOverlayState = {
    points,
    segments,
    hover: hoverScreen ? {
      screenX: hoverScreen.x,
      screenY: hoverScreen.y,
      edgeScreenPoints: hoverEdgePoints.length >= 2 ? tapeScreenPointList(hoverEdgePoints, state) : undefined,
    } : null,
  };
  const previous = overlayRef.current;
  const unchanged =
    previous &&
    previous.points.length === next.points.length &&
    previous.segments.length === next.segments.length &&
    previous.points.every((point, index) => {
      const candidate = next.points[index];
      return point.id === candidate.id && Math.abs(point.screenX - candidate.screenX) < 0.2 && Math.abs(point.screenY - candidate.screenY) < 0.2;
    }) &&
    previous.segments.every((segment, index) => {
      const candidate = next.segments[index];
      return segment.id === candidate.id
        && segment.label === candidate.label
        && segment.screenPoints === candidate.screenPoints
        && Math.abs(segment.x1 - candidate.x1) < 0.2
        && Math.abs(segment.y1 - candidate.y1) < 0.2
        && Math.abs(segment.x2 - candidate.x2) < 0.2
        && Math.abs(segment.y2 - candidate.y2) < 0.2
        && Math.abs(segment.labelX - candidate.labelX) < 0.2
        && Math.abs(segment.labelY - candidate.labelY) < 0.2;
    }) &&
    ((!previous.hover && !next.hover) ||
      (previous.hover && next.hover
        && previous.hover.edgeScreenPoints === next.hover.edgeScreenPoints
        && Math.abs(previous.hover.screenX - next.hover.screenX) < 0.2
        && Math.abs(previous.hover.screenY - next.hover.screenY) < 0.2));
  if (!unchanged) {
    overlayRef.current = next;
    setOverlay(next);
  }
}

/**
 * Wo eine Notiz gerade steht. Eine angeheftete rechnet sich aus dem Koerper,
 * an dem sie haengt - dieselbe Rechnung wie beim Massband, damit sie beim
 * Verschieben, Drehen und Groessenaendern mitfaehrt. Ist der Koerper nicht mehr
 * da, gilt die zuletzt bekannte Stelle.
 */
function noteWorldPosition(state: ThreeState, note: WorkplaneNote) {
  if (note.anchor) {
    const world = tapeAttachmentWorld(state, { shapeId: note.anchor.shapeId, normalized: note.anchor.normalized });
    if (world) return world;
  }
  return new THREE.Vector3(note.x, note.y, note.z);
}

/**
 * Die Nadeln auf den Bildschirm rechnen. Was hinter der Kamera liegt, bekommt
 * `behind` - dort ist die Projektion gespiegelt, und eine Nadel wuerde sonst auf
 * der falschen Seite auftauchen.
 */
export function syncNoteOverlay(
  state: ThreeState,
  notes: WorkplaneNote[],
  visible: boolean,
  overlayRef: MutableRefObject<NoteOverlayState | null>,
  setOverlay: (overlay: NoteOverlayState | null) => void,
) {
  if (!visible || notes.length === 0) {
    if (overlayRef.current !== null) {
      overlayRef.current = null;
      setOverlay(null);
    }
    return;
  }
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.camera.updateMatrixWorld();
  // Only notes are numbered; the reference points among them are not.
  let noteNumber = 0;
  const next: NoteOverlayState = {
    notes: notes.map((note) => {
      const projected = noteWorldPosition(state, note).project(state.camera);
      return {
        id: note.id,
        index: note.kind === "point" ? 0 : ++noteNumber,
        text: note.text,
        collapsed: Boolean(note.collapsed),
        attached: Boolean(note.anchor),
        point: note.kind === "point",
        x: note.x,
        y: note.y,
        z: note.z,
        screenX: ((projected.x + 1) / 2) * rect.width,
        screenY: ((1 - projected.y) / 2) * rect.height,
        behind: projected.z > 1,
        flipped: ((projected.x + 1) / 2) * rect.width + NOTE_CARD_REACH > rect.width,
      };
    }),
  };
  const previous = overlayRef.current;
  const unchanged = previous
    && previous.notes.length === next.notes.length
    && previous.notes.every((note, index) => {
      const candidate = next.notes[index];
      return note.id === candidate.id
        && note.index === candidate.index
        && note.text === candidate.text
        && note.collapsed === candidate.collapsed
        && note.attached === candidate.attached
        && note.point === candidate.point
        && note.x === candidate.x
        && note.y === candidate.y
        && note.z === candidate.z
        && note.behind === candidate.behind
        && note.flipped === candidate.flipped
        && Math.abs(note.screenX - candidate.screenX) < 0.2
        && Math.abs(note.screenY - candidate.screenY) < 0.2;
    });
  if (!unchanged) {
    overlayRef.current = next;
    setOverlay(next);
  }
}

/**
 * Eine Notiz ist so hoch wie das, was darin steht - eine Zeile bleibt eine
 * Zeile. Ohne das stuende unter jedem kurzen Satz ein leeres Feld, und der
 * Anfasser zum Kleinerziehen half nicht: Die Mindesthoehe war hoeher als eine
 * Zeile.
 */
function fitNoteHeight(area: HTMLTextAreaElement | null) {
  if (!area) return;
  area.style.height = "auto";
  // `scrollHeight` zaehlt den Innenabstand mit, den Rahmen nicht - und die
  // Hoehe hier ist ein Aussenmass. Ohne den Rahmen fehlen zwei Pixel, das Feld
  // laeuft ueber, und neben dem Text stuende ein Rollbalken, der ihn noch enger
  // umbricht.
  const frame = area.offsetHeight - area.clientHeight;
  area.style.height = `${Math.min(NOTE_TEXT_MAX_HEIGHT, area.scrollHeight + frame)}px`;
}

/**
 * Das Schreibfeld einer Notiz. Es misst sich nach jedem Wechsel des Textes neu -
 * auch wenn der von aussen kommt, etwa aus einem Rueckgaengig.
 *
 * While typing, the field shows its own draft: the text takes a detour through
 * the editor and the overlay before it comes back as `value`, and in between React
 * would put the old text back - which throws the cursor to the end.
 */
function NoteText({
  value,
  focused,
  onChange,
  onFocus,
  onBlur,
}: {
  value: string;
  focused: boolean;
  onChange: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  // The text as it was when the field took focus, for Escape to go back to.
  const originalRef = useRef(value);
  const shown = draft ?? value;
  useLayoutEffect(() => {
    fitNoteHeight(areaRef.current);
  }, [shown]);
  return (
    <textarea
      className="note-text"
      ref={areaRef}
      value={shown}
      maxLength={NOTE_TEXT_LIMIT}
      rows={1}
      placeholder={t("note.placeholder")}
      autoFocus={focused}
      onFocus={() => {
        originalRef.current = value;
        onFocus();
      }}
      onBlur={() => {
        setDraft(null);
        onBlur();
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(event.target.value);
      }}
      onKeyDown={(event) => {
        // Enter keeps the text, Escape takes it back to how it was; Shift+Enter starts a new line.
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (shown !== originalRef.current) {
            setDraft(originalRef.current);
            onChange(originalRef.current);
          }
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/** One coordinate of a reference point, typed in the workspace's unit; Enter or leaving the field applies it. */
function PointCoordinateField({ label, value, workspace, onCommit }: {
  label: string;
  value: number;
  workspace: WorkplaneWorkspaceSettings;
  onCommit: (millimeters: number) => void;
}) {
  const shown = formatMeasurementNumber(millimetersToDisplay(value, workspace), workspace.accuracy);
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const parsed = parseMeasurementInput(draft ?? shown);
    if (Number.isFinite(parsed)) onCommit(displayToMillimeters(parsed, workspace));
    setDraft(null);
  };
  return (
    <label className="point-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft ?? shown}
        onFocus={(event) => {
          setDraft(shown);
          event.currentTarget.select();
        }}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
      />
      <small>{lengthDisplayUnit(workspace).label}</small>
    </label>
  );
}

/**
 * Die Notizen ueber der Leinwand. Sie sind bewusst HTML und keine Textur in der
 * Szene: So bleibt die Schrift bei jeder Zoomstufe scharf, laesst sich markieren
 * und kopieren, und das Ausblenden kostet nichts.
 */
export function NoteOverlay({
  overlay,
  editingId,
  onPinPointerDown,
  onPinPointerMove,
  onPinPointerUp,
  onToggle,
  onTextChange,
  onTextCommit,
  onDetach,
  onRemove,
  onEditingIdChange,
  workspace,
  onPointChange,
  pointCardOffset,
  pointCardOffsets,
  onPointCardOffsetChange,
  onRemoveAllPoints,
}: {
  overlay: NoteOverlayState;
  /** Where a card stands that was not moved on its own yet. */
  pointCardOffset: PointCardOffset;
  /** The cards that were moved, by point. */
  pointCardOffsets: Record<string, PointCardOffset>;
  onPointCardOffsetChange: (noteId: string, offset: PointCardOffset, final: boolean) => void;
  onRemoveAllPoints?: () => void;
  workspace: WorkplaneWorkspaceSettings;
  onPointChange: (noteId: string, patch: { x?: number; y?: number; z?: number }) => void;
  editingId: string | null;
  onPinPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => void;
  onPinPointerMove: (event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => void;
  onPinPointerUp: (event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => void;
  onToggle: (noteId: string) => void;
  onTextChange: (noteId: string, text: string) => void;
  onTextCommit: (noteId: string) => void;
  onDetach: (noteId: string) => void;
  onRemove: (noteId: string) => void;
  onEditingIdChange: (noteId: string | null) => void;
}) {
  const pointCardDrag = useRef<{ pointerId: number; startX: number; startY: number; origin: PointCardOffset } | null>(null);
  // The card or pin touched last stands in front of the others, whatever its place in the list (#329).
  const [frontId, setFrontId] = useState<string | null>(null);
  const pointCount = overlay.notes.filter((note) => note.point).length;
  return (
    <div className="note-overlay" aria-label={t("editor.tool.note")}>
      {overlay.notes.map((note) => {
        if (note.behind) return null;
        const open = !note.collapsed;
        return (
          <div
            key={note.id}
            className={`note-pin-anchor ${open ? "open" : ""} ${note.flipped ? "flipped" : ""}`}
            style={{ left: note.screenX, top: note.screenY, ...(frontId === note.id ? { zIndex: 6 } : {}) }}
            onPointerDownCapture={() => setFrontId(note.id)}
          >
            <button
              type="button"
              className={`note-pin ${note.attached ? "attached" : ""} ${note.point ? "point-pin" : ""}`}
              title={note.point ? t("point.move") : t("note.move")}
              aria-label={note.point ? t("point.title") : `${t("editor.tool.note")} ${note.index}`}
              onPointerDown={(event) => onPinPointerDown(event, note.id)}
              onPointerMove={(event) => onPinPointerMove(event, note.id)}
              onPointerUp={(event) => onPinPointerUp(event, note.id)}
              onClick={() => onToggle(note.id)}
            >
              {note.point ? <Crosshair size={15} strokeWidth={2.6} aria-hidden="true" /> : note.index}
            </button>
            {open && note.point ? (() => {
              const offset = pointCardOffsets[note.id] ?? pointCardOffset;
              return (
              <div
                className="note-card point-card"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <strong
                  className="point-card-handle"
                  title={t("panel.moveHint")}
                  onPointerDown={(event) => {
                    capturePointer(event.currentTarget, event.pointerId);
                    pointCardDrag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: offset };
                  }}
                  onPointerMove={(event) => {
                    const drag = pointCardDrag.current;
                    if (!drag || drag.pointerId !== event.pointerId) return;
                    onPointCardOffsetChange(note.id, { x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY }, false);
                  }}
                  onPointerUp={(event) => {
                    const drag = pointCardDrag.current;
                    if (!drag || drag.pointerId !== event.pointerId) return;
                    pointCardDrag.current = null;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                    onPointCardOffsetChange(note.id, { x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY }, true);
                  }}
                  onDoubleClick={() => onPointCardOffsetChange(note.id, { x: 0, y: 0 }, true)}
                >
                  {t("point.title")}
                </strong>
                <PointCoordinateField label={t("prop.positionX")} value={note.x} workspace={workspace} onCommit={(x) => onPointChange(note.id, { x })} />
                <PointCoordinateField label={t("prop.positionY")} value={displayY(note.z)} workspace={workspace} onCommit={(y) => onPointChange(note.id, { z: insideZ(y) })} />
                <PointCoordinateField label={t("prop.positionZ")} value={note.y} workspace={workspace} onCommit={(y) => onPointChange(note.id, { y })} />
                <div className="note-card-actions">
                  <span className="note-hint">{t("point.hint")}</span>
                  <span className="note-card-end">
                    <GuideHelpLink section="referencePoints" className="note-help-link" iconSize={16} />
                    <button type="button" className="note-action danger" onClick={() => onRemove(note.id)}>{t("common.delete")}</button>
                  </span>
                </div>
                {pointCount > 1 && onRemoveAllPoints ? (
                  <button type="button" className="note-action danger point-delete-all" onClick={onRemoveAllPoints}>{t("point.deleteAll", { count: pointCount })}</button>
                ) : null}
              </div>
              );
            })() : open ? (
              <div className="note-card" onPointerDown={(event) => event.stopPropagation()}>
                <NoteText
                  value={note.text}
                  focused={editingId === note.id}
                  onFocus={() => onEditingIdChange(note.id)}
                  onBlur={() => {
                    onEditingIdChange(null);
                    onTextCommit(note.id);
                  }}
                  onChange={(text) => onTextChange(note.id, text)}
                />
                <div className="note-card-actions">
                  {note.attached ? (
                    <button type="button" className="note-action" onClick={() => onDetach(note.id)}>{t("note.detach")}</button>
                  ) : <span className="note-hint">{t("note.free")}</span>}
                  <span className="note-card-end">
                    <GuideHelpLink section="notes" className="note-help-link" iconSize={16} />
                    <button type="button" className="note-action danger" onClick={() => onRemove(note.id)}>{t("common.delete")}</button>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function TapeOverlay({
  overlay,
  startPointId,
  active,
  deleteMode,
  moveMode,
  onPointPointerDown,
  onPointPointerMove,
  onPointPointerUp,
  onSegmentPointerDown,
  onMarkMiddle,
}: {
  overlay: TapeOverlayState;
  startPointId: string | null;
  active: boolean;
  deleteMode: boolean;
  moveMode: boolean;
  onPointPointerDown: (event: ReactPointerEvent<SVGCircleElement>, pointId: string) => void;
  onPointPointerMove: (event: ReactPointerEvent<SVGCircleElement>, pointId: string) => void;
  onPointPointerUp: (event: ReactPointerEvent<SVGCircleElement>, pointId: string) => void;
  onSegmentPointerDown: (event: ReactPointerEvent<SVGElement>, segmentId: string) => void;
  /** Puts a reference point in the middle of a measurement (#323). */
  onMarkMiddle?: (segmentId: string) => void;
}) {
  return (
    <div className={`tape-overlay ${active ? "active" : ""} ${deleteMode ? "delete-mode" : ""} ${moveMode ? "move-mode" : ""}`} aria-label={t("aria.tapeMeasurements")}>
      <svg className="tape-guides" width="100%" height="100%" aria-hidden="true">
        {overlay.segments.map((segment) => (
          <g key={segment.id} className="tape-segment-group">
            {segment.screenPoints ? (
              <>
                <polyline className="tape-segment" points={segment.screenPoints} fill="none" />
                <polyline className="tape-segment-hit" points={segment.screenPoints} fill="none" onPointerDown={(event) => onSegmentPointerDown(event, segment.id)} />
              </>
            ) : (
              <>
                <line className="tape-segment" x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} />
                <line
                  className="tape-segment-hit"
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  onPointerDown={(event) => onSegmentPointerDown(event, segment.id)}
                />
              </>
            )}
          </g>
        ))}
        {overlay.points.map((point) => (
          <circle
            key={point.id}
            className={`tape-point ${point.id === startPointId ? "pending" : ""}`}
            cx={point.screenX}
            cy={point.screenY}
            r="5"
            onPointerDown={(event) => onPointPointerDown(event, point.id)}
            onPointerMove={(event) => onPointPointerMove(event, point.id)}
            onPointerUp={(event) => onPointPointerUp(event, point.id)}
            onPointerCancel={(event) => onPointPointerUp(event, point.id)}
          />
        ))}
        {active && overlay.hover?.edgeScreenPoints ? <polyline className="tape-hover-edge" points={overlay.hover.edgeScreenPoints} fill="none" /> : null}
        {active && overlay.hover ? <circle className="tape-hover-point" cx={overlay.hover.screenX} cy={overlay.hover.screenY} r="5" /> : null}
      </svg>
      {overlay.segments.map((segment) => (
        <span key={`${segment.id}-label`} className="tape-label" style={{ left: segment.labelX, top: segment.labelY }}>
          {segment.label}
        </span>
      ))}
      {onMarkMiddle && !deleteMode ? overlay.segments.map((segment) => (
        <button
          key={`${segment.id}-mark`}
          type="button"
          className="tape-mark"
          style={{ left: segment.labelX, top: segment.labelY + 24 }}
          title={t("camera.tapeMarkMiddle")}
          aria-label={t("camera.tapeMarkMiddle")}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onMarkMiddle(segment.id)}
        >
          <Crosshair size={13} aria-hidden="true" />
        </button>
      )) : null}
    </div>
  );
}

export type RulerDimensionOverlayItem = {
  key: string;
  rulerId: string;
  shapeId: string;
  field: RulerDimensionField | null;
  value: number;
  label: string;
  labelX: number;
  labelY: number;
  handleX: number;
  handleY: number;
};

export type RulerDimensionOverlayState = {
  items: RulerDimensionOverlayItem[];
};

/**
 * Wer neben einem Lineal steht, bekommt seine Ausdehnung entlang dessen Achse
 * eingeblendet - kein eigener Werkzeugmodus, das Lineal ist einfach ein
 * Koerper auf der Arbeitsflaeche. Rechnet ueber alle Lineale und alle anderen
 * Formen; bei der ueblichen Formenzahl ist das billig genug fuer jeden Sync.
 */
export function syncRulerDimensionOverlay(
  state: ThreeState | null,
  shapes: WorkplaneShape[],
  overlayRef: MutableRefObject<RulerDimensionOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<RulerDimensionOverlayState | null>>,
  accuracy: MeasurementAccuracy,
) {
  const items: RulerDimensionOverlayItem[] = [];
  if (state) {
    const rulers = shapes.filter((shape) => shape.kind === "ruler" && !shape.hidden);
    const topY = shapes.reduce((max, shape) => Math.max(max, (shape.elevation ?? 0) + shape.height), 0);
    rulers.forEach((ruler) => {
      const rulerPose = { x: ruler.x, z: ruler.z, rotation: ruler.rotation, length: shapeWidth(ruler), crossWidth: shapeDepth(ruler) };
      const axisAcross = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternionForShape(ruler));
      shapes.forEach((candidate) => {
        if (candidate.id === ruler.id || isNonSolidShapeKind(candidate.kind) || candidate.hidden) return;
        const match = rulerDimensionMatch(rulerPose, {
          x: candidate.x,
          z: candidate.z,
          rotation: candidate.rotation,
          rotationX: candidate.rotationX,
          rotationZ: candidate.rotationZ,
          width: shapeWidth(candidate),
          height: candidate.height,
          depth: shapeDepth(candidate),
        });
        if (!match) return;
        const acrossSign = match.acrossOffset >= 0 ? 1 : -1;
        const labelAcross = acrossSign * (rulerPose.crossWidth / 2 + 16);
        const labelAlong = pointAlongRuler(rulerPose, match.alongOffset);
        const labelWorld = new THREE.Vector3(labelAlong.x + axisAcross.x * labelAcross, topY + 6, labelAlong.z + axisAcross.z * labelAcross);
        const handleAt = pointAlongRuler(rulerPose, match.alongOffset + match.extentAlong / 2);
        const handleWorld = new THREE.Vector3(handleAt.x, topY + 6, handleAt.z);
        const labelScreen = projectToScreen(labelWorld, state);
        const handleScreen = projectToScreen(handleWorld, state);
        items.push({
          key: `${ruler.id}:${candidate.id}`,
          rulerId: ruler.id,
          shapeId: candidate.id,
          field: match.alignedField,
          value: match.extentAlong,
          label: formatMeasure(match.extentAlong, accuracy),
          labelX: labelScreen.x,
          labelY: labelScreen.y,
          handleX: handleScreen.x,
          handleY: handleScreen.y,
        });
      });
    });
  }
  const previous = overlayRef.current;
  if (previous && previous.items.length === 0 && items.length === 0) {
    return;
  }
  const next = { items };
  overlayRef.current = next;
  setOverlay(next);
}

export function RulerDimensionOverlay({
  overlay,
  onLabelClick,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
}: {
  overlay: RulerDimensionOverlayState;
  onLabelClick: (item: RulerDimensionOverlayItem) => void;
  onHandlePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, item: RulerDimensionOverlayItem) => void;
  onHandlePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onHandlePointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  if (overlay.items.length === 0) {
    return null;
  }
  return (
    <div className="ruler-dimension-overlay" aria-label={t("aria.rulerDimensions")}>
      {overlay.items.map((item) => (
        <span key={item.key}>
          {item.field ? (
            <button
              type="button"
              className="ruler-dimension-label editable"
              style={{ left: item.labelX, top: item.labelY }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onLabelClick(item)}
            >
              {item.label}
            </button>
          ) : (
            <span className="ruler-dimension-label" style={{ left: item.labelX, top: item.labelY }}>
              {item.label}
            </span>
          )}
          <button
            type="button"
            className="ruler-duplicate-handle"
            aria-label={t("camera.duplicateAlongRuler")}
            title={t("camera.duplicateAlongRuler")}
            style={{ left: item.handleX, top: item.handleY }}
            onPointerDown={(event) => onHandlePointerDown(event, item)}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
            <Plus size={12} strokeWidth={3} aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

/** Ein platziertes Winkellineal - reines Bildschirm-Werkzeug wie das Massband, kein Koerper, nicht gespeichert (siehe layerling-lineal.md). */
export type CornerRulerInstance = {
  id: string;
  /** Die Ecke in Weltkoordinaten, immer in der Ebene von `workplane`. */
  corner: PlacementPoint;
  /** Die Arbeitsebene beim Ablegen - auf der Platte die Platte, sonst die Flaeche (#105). Ziehen bleibt in ihr. */
  workplane: PlacementWorkplane;
  /** Richtung der beiden Arme und der Hoehe; ein Klick auf den Griff dreht sie um die Normale. */
  frame: CornerRulerFrame;
  armLengthX: number;
  armLengthZ: number;
  mode?: CornerRulerMode;
};

type CornerRulerTickScreen = { x1: number; y1: number; x2: number; y2: number };

type CornerRulerLabelScreen = { x: number; y: number; text: string };

export type CornerRulerNeighborLabel = { key: string; x: number; y: number; text: string };

type CornerRulerOverlayItem = {
  id: string;
  mode: CornerRulerMode;
  handleX: number;
  handleY: number;
  armXLine: { x1: number; y1: number; x2: number; y2: number };
  armZLine: { x1: number; y1: number; x2: number; y2: number };
  ticks: CornerRulerTickScreen[];
  labels: CornerRulerLabelScreen[];
  neighborLabels: CornerRulerNeighborLabel[];
  selectedCoordinate?: {
    shapeIds: string[];
    xValue: number;
    zValue: number;
    elevationValue: number;
    xLabel: { x: number; y: number; text: string };
    zLabel: { x: number; y: number; text: string };
    elevationLabel: { x: number; y: number; text: string };
    xArrowLine: { x1: number; y1: number; x2: number; y2: number };
    zArrowLine: { x1: number; y1: number; x2: number; y2: number };
    elevationArrowLine: { x1: number; y1: number; x2: number; y2: number };
    xGuideLine: { x1: number; y1: number; x2: number; y2: number };
    zGuideLine: { x1: number; y1: number; x2: number; y2: number };
  } | null;
};

export type CornerRulerOverlayState = {
  items: CornerRulerOverlayItem[];
};

/** Bemassungslabel eines Nachbarn an einem Arm - reine Ablesung, kein Eintippen (siehe layerling-lineal.md). */
function cornerRulerNeighborLabel(
  key: string,
  armPose: { x: number; z: number; rotation: number; length: number; crossWidth: number },
  acrossAxis: THREE.Vector3,
  match: RulerDimensionMatch,
  topY: number,
  state: ThreeState,
  accuracy: MeasurementAccuracy,
): CornerRulerNeighborLabel {
  const acrossSign = match.acrossOffset >= 0 ? 1 : -1;
  const labelAcross = acrossSign * (CORNER_RULER_ARM_WIDTH / 2 + 16);
  const labelAlong = pointAlongRuler(armPose, match.alongOffset);
  const labelWorld = new THREE.Vector3(labelAlong.x + acrossAxis.x * labelAcross, topY + 6, labelAlong.z + acrossAxis.z * labelAcross);
  const labelScreen = projectToScreen(labelWorld, state);
  return { key, x: labelScreen.x, y: labelScreen.y, text: formatMeasure(match.extentAlong, accuracy) };
}

/**
 * Projiziert jede platzierte Winkellineal-Instanz auf den Bildschirm: die
 * Ecke, die beiden Arm-Endpunkte, jeden Teilstrich (`cornerRulerTicks`),
 * die relative Bemaßung des ausgewählten Körpers (wie in similar tools) sowie
 * die automatische Bemaßung weiterer Formen am Lineal.
 * Reine Bildschirm-Darstellung wie beim Massband - kein Three.js-Objekt.
 */
export function syncCornerRulerToolOverlay(
  state: ThreeState | null,
  rulers: CornerRulerInstance[],
  shapes: WorkplaneShape[],
  selectedIds: string[],
  overlayRef: MutableRefObject<CornerRulerOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<CornerRulerOverlayState | null>>,
  accuracy: MeasurementAccuracy,
) {
  const items: CornerRulerOverlayItem[] = [];
  if (state) {
    const topY = shapes.reduce((max, shape) => Math.max(max, (shape.elevation ?? 0) + shape.height), 0);
    // Mehrere markierte Koerper zaehlen zusammen wie einer: gemessen wird
    // ihre gemeinsame Umrissbox, wie beim Abstand zum Nullpunkt.
    const wanted = new Set(selectedIds);
    const selectedShapes = shapes.filter((s) => wanted.has(s.id) && !s.hidden && !isNonSolidShapeKind(s.kind));

    rulers.forEach((ruler) => {
      const armWidth = CORNER_RULER_ARM_WIDTH;
      const mode: CornerRulerMode = ruler.mode ?? "endpoint";
      const xAxis = new THREE.Vector3(ruler.frame.xAxis.x, ruler.frame.xAxis.y, ruler.frame.xAxis.z).normalize();
      const zAxis = new THREE.Vector3(ruler.frame.zAxis.x, ruler.frame.zAxis.y, ruler.frame.zAxis.z).normalize();
      const yAxis = new THREE.Vector3(ruler.frame.normal.x, ruler.frame.normal.y, ruler.frame.normal.z).normalize();
      const corner = new THREE.Vector3(ruler.corner.x, ruler.corner.y, ruler.corner.z);

      const handleScreen = projectToScreen(corner, state);
      const armXEndScreen = projectToScreen(corner.clone().addScaledVector(xAxis, ruler.armLengthX), state);
      const armZEndScreen = projectToScreen(corner.clone().addScaledVector(zAxis, ruler.armLengthZ), state);

      const ticks: CornerRulerTickScreen[] = [];
      const labels: CornerRulerLabelScreen[] = [];
      const buildTicks = (axisDir: THREE.Vector3, acrossDir: THREE.Vector3, length: number) => {
        cornerRulerTicks(length).forEach((tick) => {
          const base = corner.clone().addScaledVector(axisDir, tick.offset);
          const tickHeight = armWidth * (tick.isTen ? 0.62 : tick.isFive ? 0.42 : 0.26);
          const baseScreen = projectToScreen(base, state);
          const tipScreen = projectToScreen(base.clone().addScaledVector(acrossDir, tickHeight), state);
          ticks.push({ x1: baseScreen.x, y1: baseScreen.y, x2: tipScreen.x, y2: tipScreen.y });
          if (tick.isTen && tick.offset > 0) {
            const labelScreen = projectToScreen(base.clone().addScaledVector(acrossDir, armWidth * 0.95), state);
            labels.push({ x: labelScreen.x, y: labelScreen.y, text: String(tick.offset) });
          }
        });
      };
      // Die Teilstriche zeigen nach aussen (weg vom jeweils anderen Arm),
      // wie bei vergleichbaren Programmen - nicht in die Ecke hinein, wo sonst platzierte
      // Formen sitzen wuerden.
      buildTicks(xAxis, zAxis.clone().negate(), ruler.armLengthX);
      buildTicks(zAxis, xAxis.clone().negate(), ruler.armLengthZ);

      let selectedCoordinate: CornerRulerOverlayItem["selectedCoordinate"] = null;
      if (selectedShapes.length) {
        const bounds = projectShapesExtent(selectedShapes, xAxis, yAxis, zAxis, corner);
        const coords = computeCornerRulerRelativeCoordinates({
          rulerCorner: ruler.corner,
          rulerRotation: 0,
          frame: ruler.frame,
          mode,
          bounds,
        });

        const xEndScreen = projectToScreen(new THREE.Vector3(coords.xEndpointOnAxis.x, coords.xEndpointOnAxis.y, coords.xEndpointOnAxis.z), state);
        const zEndScreen = projectToScreen(new THREE.Vector3(coords.zEndpointOnAxis.x, coords.zEndpointOnAxis.y, coords.zEndpointOnAxis.z), state);
        const xTargetScreen = projectToScreen(new THREE.Vector3(coords.xTargetPoint.x, coords.xTargetPoint.y, coords.xTargetPoint.z), state);
        const zTargetScreen = projectToScreen(new THREE.Vector3(coords.zTargetPoint.x, coords.zTargetPoint.y, coords.zTargetPoint.z), state);
        const elevBaseScreen = projectToScreen(new THREE.Vector3(coords.elevationBasePoint.x, coords.elevationBasePoint.y, coords.elevationBasePoint.z), state);
        const elevTargetScreen = projectToScreen(new THREE.Vector3(coords.elevationTargetPoint.x, coords.elevationTargetPoint.y, coords.elevationTargetPoint.z), state);

        const dxX = xEndScreen.x - handleScreen.x;
        const dyX = xEndScreen.y - handleScreen.y;
        const lenX = Math.hypot(dxX, dyX) || 1;
        const normX = { x: -dyX / lenX, y: dxX / lenX };
        const sideX = normX.y >= 0 ? 1 : -1;
        const xLabelPos = {
          x: (handleScreen.x + xEndScreen.x) / 2 + normX.x * 22 * sideX,
          y: (handleScreen.y + xEndScreen.y) / 2 + normX.y * 22 * sideX,
        };

        const dxZ = zEndScreen.x - handleScreen.x;
        const dyZ = zEndScreen.y - handleScreen.y;
        const lenZ = Math.hypot(dxZ, dyZ) || 1;
        const normZ = { x: -dyZ / lenZ, y: dxZ / lenZ };
        const sideZ = normZ.x <= 0 ? 1 : -1;
        const zLabelPos = {
          x: (handleScreen.x + zEndScreen.x) / 2 + normZ.x * 22 * sideZ,
          y: (handleScreen.y + zEndScreen.y) / 2 + normZ.y * 22 * sideZ,
        };

        const elevationLabelPos = {
          x: (elevBaseScreen.x + elevTargetScreen.x) / 2 + 28,
          y: (elevBaseScreen.y + elevTargetScreen.y) / 2,
        };

        selectedCoordinate = {
          shapeIds: selectedShapes.map((shape) => shape.id),
          xValue: coords.x,
          zValue: coords.z,
          elevationValue: coords.elevation,
          xLabel: { x: xLabelPos.x, y: xLabelPos.y, text: formatMeasure(coords.x, accuracy) },
          zLabel: { x: zLabelPos.x, y: zLabelPos.y, text: formatMeasure(coords.z, accuracy) },
          elevationLabel: { x: elevationLabelPos.x, y: elevationLabelPos.y, text: formatMeasure(coords.elevation, accuracy) },
          xArrowLine: { x1: handleScreen.x, y1: handleScreen.y, x2: xEndScreen.x, y2: xEndScreen.y },
          zArrowLine: { x1: handleScreen.x, y1: handleScreen.y, x2: zEndScreen.x, y2: zEndScreen.y },
          elevationArrowLine: { x1: elevBaseScreen.x, y1: elevBaseScreen.y, x2: elevTargetScreen.x, y2: elevTargetScreen.y },
          xGuideLine: { x1: xEndScreen.x, y1: xEndScreen.y, x2: xTargetScreen.x, y2: xTargetScreen.y },
          zGuideLine: { x1: zEndScreen.x, y1: zEndScreen.y, x2: zTargetScreen.x, y2: zTargetScreen.y },
        };
      }

      const neighborLabels: CornerRulerNeighborLabel[] = [];
      // Die Masse der Formen an den Armen gibt es nur auf der Platte; auf einer
      // Flaeche zeigt das Winkellineal nur die Abstaende der Auswahl (#105).
      const flatRotation = cornerRulerFlatRotation(ruler.frame);
      shapes.forEach((candidate) => {
        if (flatRotation === null) return;
        if (isNonSolidShapeKind(candidate.kind) || candidate.hidden) return;
        if (wanted.has(candidate.id)) return;
        const { armX, armZ } = cornerRulerDimensionMatchesFromCorner(
          { x: ruler.corner.x, z: ruler.corner.z },
          flatRotation,
          ruler.armLengthX,
          ruler.armLengthZ,
          armWidth,
          {
            x: candidate.x,
            z: candidate.z,
            rotation: candidate.rotation,
            rotationX: candidate.rotationX,
            rotationZ: candidate.rotationZ,
            width: shapeWidth(candidate),
            height: candidate.height,
            depth: shapeDepth(candidate),
          },
        );
        if (armX) {
          neighborLabels.push(cornerRulerNeighborLabel(
            `${ruler.id}:${candidate.id}:x`,
            { x: ruler.corner.x, z: ruler.corner.z, rotation: flatRotation, length: ruler.armLengthX, crossWidth: armWidth },
            zAxis, armX, topY, state, accuracy,
          ));
        }
        if (armZ) {
          neighborLabels.push(cornerRulerNeighborLabel(
            `${ruler.id}:${candidate.id}:z`,
            { x: ruler.corner.x, z: ruler.corner.z, rotation: flatRotation + 90, length: ruler.armLengthZ, crossWidth: armWidth },
            xAxis, armZ, topY, state, accuracy,
          ));
        }
      });

      items.push({
        id: ruler.id,
        mode,
        handleX: handleScreen.x,
        handleY: handleScreen.y,
        armXLine: { x1: handleScreen.x, y1: handleScreen.y, x2: armXEndScreen.x, y2: armXEndScreen.y },
        armZLine: { x1: handleScreen.x, y1: handleScreen.y, x2: armZEndScreen.x, y2: armZEndScreen.y },
        ticks,
        labels,
        neighborLabels,
        selectedCoordinate,
      });
    });
  }
  const previous = overlayRef.current;
  if (previous && previous.items.length === 0 && items.length === 0) {
    return;
  }
  const next = { items };
  overlayRef.current = next;
  setOverlay(next);
}

export function CornerRulerToolOverlay({
  overlay,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onDelete,
  onToggleMode,
  onCoordinateClick,
}: {
  overlay: CornerRulerOverlayState;
  onHandlePointerDown: (event: ReactPointerEvent<SVGCircleElement>, id: string) => void;
  onHandlePointerMove: (event: ReactPointerEvent<SVGCircleElement>, id: string) => void;
  onHandlePointerUp: (event: ReactPointerEvent<SVGCircleElement>, id: string) => void;
  onDelete: (id: string) => void;
  onToggleMode: (id: string) => void;
  onCoordinateClick: (rulerId: string, shapeIds: string[], axis: "x" | "z" | "elevation", value: number, x: number, y: number) => void;
}) {
  if (overlay.items.length === 0) {
    return null;
  }
  return (
    <div className="corner-ruler-overlay" aria-label={t("aria.cornerRulerTool")}>
      <svg className="corner-ruler-guides" width="100%" height="100%" aria-hidden="true">
        {overlay.items.map((item) => (
          <g key={item.id} className="corner-ruler-group">
            <line className="corner-ruler-arm" x1={item.armXLine.x1} y1={item.armXLine.y1} x2={item.armXLine.x2} y2={item.armXLine.y2} />
            <line className="corner-ruler-arm" x1={item.armZLine.x1} y1={item.armZLine.y1} x2={item.armZLine.x2} y2={item.armZLine.y2} />
            {item.ticks.map((tick, index) => (
              <line key={index} className="corner-ruler-tick" x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} />
            ))}
            {item.selectedCoordinate ? (
              <g className="ruler-coordinate-visuals">
                <line className="ruler-coordinate-arrow" x1={item.selectedCoordinate.xArrowLine.x1} y1={item.selectedCoordinate.xArrowLine.y1} x2={item.selectedCoordinate.xArrowLine.x2} y2={item.selectedCoordinate.xArrowLine.y2} />
                <line className="ruler-coordinate-arrow" x1={item.selectedCoordinate.zArrowLine.x1} y1={item.selectedCoordinate.zArrowLine.y1} x2={item.selectedCoordinate.zArrowLine.x2} y2={item.selectedCoordinate.zArrowLine.y2} />
                <line className="ruler-coordinate-arrow" x1={item.selectedCoordinate.elevationArrowLine.x1} y1={item.selectedCoordinate.elevationArrowLine.y1} x2={item.selectedCoordinate.elevationArrowLine.x2} y2={item.selectedCoordinate.elevationArrowLine.y2} />
                <line className="ruler-coordinate-guide" x1={item.selectedCoordinate.xGuideLine.x1} y1={item.selectedCoordinate.xGuideLine.y1} x2={item.selectedCoordinate.xGuideLine.x2} y2={item.selectedCoordinate.xGuideLine.y2} />
                <line className="ruler-coordinate-guide" x1={item.selectedCoordinate.zGuideLine.x1} y1={item.selectedCoordinate.zGuideLine.y1} x2={item.selectedCoordinate.zGuideLine.x2} y2={item.selectedCoordinate.zGuideLine.y2} />
              </g>
            ) : null}
            <circle
              className="corner-ruler-handle"
              cx={item.handleX}
              cy={item.handleY}
              r="6"
              onPointerDown={(event) => onHandlePointerDown(event, item.id)}
              onPointerMove={(event) => onHandlePointerMove(event, item.id)}
              onPointerUp={(event) => onHandlePointerUp(event, item.id)}
              onPointerCancel={(event) => onHandlePointerUp(event, item.id)}
            />
          </g>
        ))}
      </svg>
      {overlay.items.map((item) => (
        <span key={`${item.id}-labels`}>
          {item.labels.map((label, index) => (
            <span key={index} className="corner-ruler-tick-label" style={{ left: label.x, top: label.y }}>
              {label.text}
            </span>
          ))}
          {item.neighborLabels.map((label) => (
            <span key={label.key} className="ruler-dimension-label" style={{ left: label.x, top: label.y }}>
              {label.text}
            </span>
          ))}
          {item.selectedCoordinate ? (
            <>
              <button
                type="button"
                className="ruler-coordinate-badge"
                style={{ left: item.selectedCoordinate.xLabel.x, top: item.selectedCoordinate.xLabel.y }}
                aria-label={t("aria.rulerCoordinateX")}
                title={t("ruler.coordinate.x")}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onCoordinateClick(item.id, item.selectedCoordinate!.shapeIds, "x", item.selectedCoordinate!.xValue, item.selectedCoordinate!.xLabel.x, item.selectedCoordinate!.xLabel.y)}
              >
                {item.selectedCoordinate.xLabel.text}
              </button>
              <button
                type="button"
                className="ruler-coordinate-badge"
                style={{ left: item.selectedCoordinate.zLabel.x, top: item.selectedCoordinate.zLabel.y }}
                aria-label={t("aria.rulerCoordinateZ")}
                title={t("ruler.coordinate.z")}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onCoordinateClick(item.id, item.selectedCoordinate!.shapeIds, "z", item.selectedCoordinate!.zValue, item.selectedCoordinate!.zLabel.x, item.selectedCoordinate!.zLabel.y)}
              >
                {item.selectedCoordinate.zLabel.text}
              </button>
              <button
                type="button"
                className="ruler-coordinate-badge"
                style={{ left: item.selectedCoordinate.elevationLabel.x, top: item.selectedCoordinate.elevationLabel.y }}
                aria-label={t("aria.rulerCoordinateElevation")}
                title={t("ruler.coordinate.elevation")}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onCoordinateClick(item.id, item.selectedCoordinate!.shapeIds, "elevation", item.selectedCoordinate!.elevationValue, item.selectedCoordinate!.elevationLabel.x, item.selectedCoordinate!.elevationLabel.y)}
              >
                {item.selectedCoordinate.elevationLabel.text}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="corner-ruler-mode-toggle"
            style={{ left: item.handleX - 16, top: item.handleY - 14 }}
            aria-label={t("aria.toggleCornerRulerMode")}
            title={item.mode === "midpoint" ? t("ruler.mode.midpoint") : t("ruler.mode.endpoint")}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onToggleMode(item.id)}
          >
            {item.mode === "midpoint" ? (
              <Crosshair size={11} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Rows3 size={11} strokeWidth={2.5} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="corner-ruler-delete"
            style={{ left: item.handleX + 16, top: item.handleY - 14 }}
            aria-label={t("aria.deleteCornerRuler")}
            title={t("aria.deleteCornerRuler")}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onDelete(item.id)}
          >
            <X size={10} strokeWidth={3} aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

export function syncOriginDimensionWorldLines(state: ThreeState, frame: OriginDimensionFrame | null, theme: ResolvedAppTheme) {
  const layer = state.originDimensionLayer;
  const signature = frame
    ? [frame.origin.x, frame.origin.y, frame.origin.z, frame.distanceX, frame.distanceZ, theme].join(":")
    : "";
  if (layer.userData.originDimensionSignature === signature) {
    return;
  }
  layer.userData.originDimensionSignature = signature;
  disposeChildren(layer);
  if (!frame || (frame.distanceX === null && frame.distanceZ === null)) {
    state.needsRender = true;
    return;
  }

  const origin = frame.origin;
  const solidColor = ORIGIN_DIMENSION_LINE_COLOR[theme];
  const solidPoints: number[] = [];

  const addSegment = (points: number[], start: THREE.Vector3, end: THREE.Vector3) => {
    points.push(start.x, start.y, start.z, end.x, end.y, end.z);
  };
  const addWideSegments = (points: number[], color: string, linewidth: number, opacity: number, renderOrder: number) => {
    if (points.length === 0) {
      return;
    }
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(points);
    const material = new LineMaterial({
      color,
      linewidth,
      worldUnits: false,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      alphaToCoverage: false,
    });
    material.toneMapped = false;
    const rect = state.renderer.domElement.getBoundingClientRect();
    material.resolution.set(Math.max(1, rect.width), Math.max(1, rect.height));
    const lines = new LineSegments2(geometry, material);
    lines.renderOrder = renderOrder;
    lines.frustumCulled = false;
    setObjectRenderLayer(lines, RENDER_LAYER_HELPERS);
    layer.add(lines);
  };
  const addArrow = (endpoint: THREE.Vector3, direction: THREE.Vector3, magnitude: number) => {
    const arrowLength = Math.min(1.1, Math.max(0.26, magnitude * 0.5));
    const arrowWidth = arrowLength * 0.72;
    const base = endpoint.clone().addScaledVector(direction, -arrowLength);
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(arrowWidth / 2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([
        endpoint.x, endpoint.y, endpoint.z,
        base.x + perpendicular.x, base.y, base.z + perpendicular.z,
        base.x - perpendicular.x, base.y, base.z - perpendicular.z,
      ], 3),
    );
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: solidColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    });
    arrowMaterial.toneMapped = false;
    const arrow = new THREE.Mesh(geometry, arrowMaterial);
    arrow.renderOrder = 1002;
    arrow.frustumCulled = false;
    setObjectRenderLayer(arrow, RENDER_LAYER_HELPERS);
    layer.add(arrow);
  };

  const addLeg = (endpoint: THREE.Vector3 | null) => {
    if (!endpoint) return;
    const delta = endpoint.clone().sub(origin);
    const length = delta.length();
    if (length < 1e-9) return;
    const direction = delta.multiplyScalar(1 / length);
    const overrun = Math.min(2, Math.max(0.5, length * 0.15));
    const start = origin.clone().addScaledVector(direction, -overrun);
    addSegment(solidPoints, start, endpoint);
    addArrow(endpoint, direction, length);
  };

  addLeg(frame.xEndpoint);
  addLeg(frame.zEndpoint);

  addWideSegments(solidPoints, solidColor, 1.45, 1, 1001);
  state.needsRender = true;
}

export function shapeCenter(shape: WorkplaneShape) {
  return new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
}

export function shapeLocalExtents(shape: WorkplaneShape) {
  const footprint = shapeOverallFootprintDimensions(shape);
  return {
    x: footprint.width / 2,
    y: shape.height / 2,
    z: footprint.depth / 2,
  };
}

type AxisProjectionBounds = {
  min: THREE.Vector3;
  max: THREE.Vector3;
};

// Walking every vertex of an imported mesh is too slow to do on each pointer
// move, and a drag hands in a fresh copy of the shape for every move. Moving a
// shape only shifts its bounds, so they are kept per mesh, measured from the
// shape's centre, for as long as nothing but the position changes.
// Copies of a shape share one mesh, hence a short list per mesh.
const importedShapeProjectionBoundsCache = new WeakMap<object, Array<{ shape: WorkplaneShape; byAxis: Map<string, AxisProjectionBounds> }>>();

const MAX_PROJECTION_BOUNDS_PER_MESH = 16;

function sameShapeApartFromPosition(a: WorkplaneShape, b: WorkplaneShape) {
  if (a === b) return true;
  const left = a as unknown as Record<string, unknown>;
  const right = b as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (key === "x" || key === "z" || key === "elevation") continue;
    if (left[key] !== right[key]) return false;
  }
  return true;
}

function importedShapeProjectionBounds(
  shape: WorkplaneShape,
  xAxis: THREE.Vector3,
  yAxis: THREE.Vector3,
  zAxis: THREE.Vector3,
) {
  if (!shape.importedMesh?.positions.length) {
    return null;
  }

  const axisKey = [...xAxis.toArray(), ...yAxis.toArray(), ...zAxis.toArray()].map((value) => value.toFixed(6)).join(":");
  let meshCache = importedShapeProjectionBoundsCache.get(shape.importedMesh);
  if (!meshCache) {
    meshCache = [];
    importedShapeProjectionBoundsCache.set(shape.importedMesh, meshCache);
  }
  let entry = meshCache.find((candidate) => sameShapeApartFromPosition(candidate.shape, shape));
  if (!entry) {
    entry = { shape, byAxis: new Map() };
    meshCache.push(entry);
    if (meshCache.length > MAX_PROJECTION_BOUNDS_PER_MESH) meshCache.shift();
  }
  const shapeCache = entry.byAxis;
  const center = shapeCenter(shape);
  const centerOffset = new THREE.Vector3(center.dot(xAxis), center.dot(yAxis), center.dot(zAxis));
  const cached = shapeCache.get(axisKey);
  if (cached) {
    return {
      min: cached.min.clone().add(centerOffset),
      max: cached.max.clone().add(centerOffset),
    };
  }

  const preserveSize = preservesEdgeTreatmentSize(shape);
  const positions = preserveSize ? resizedImportedMeshPositions(shape) : shape.importedMesh.positions;
  const scaleX = preserveSize ? 1 : shapeWidth(shape) / Math.max(0.001, shape.importedMesh.baseWidth);
  const scaleY = preserveSize ? 1 : shape.height / Math.max(0.001, shape.importedMesh.baseHeight);
  const scaleZ = preserveSize ? 1 : shapeDepth(shape) / Math.max(0.001, shape.importedMesh.baseDepth);
  const quaternion = quaternionForShape(shape);
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  const point = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const tapered = shapeHasTaper(shape);
  const deformed = shapeHasExtrudeDeform(shape);
  let taperMinY = Number.POSITIVE_INFINITY;
  let taperMaxY = Number.NEGATIVE_INFINITY;
  if (tapered || deformed) {
    for (let index = 1; index < positions.length; index += 3) {
      const localY = positions[index] * scaleY;
      taperMinY = Math.min(taperMinY, localY);
      taperMaxY = Math.max(taperMaxY, localY);
    }
  }
  const taperHeight = Math.max(1e-6, taperMaxY - taperMinY);

  for (let index = 0; index + 2 < positions.length; index += 3) {
    const localY = positions[index + 1] * scaleY;
    const normalizedHeight = (tapered || deformed) ? (localY - taperMinY) / taperHeight : 0;
    const widthScale = tapered ? shapeTaperScaleAt(shape, normalizedHeight, "width") : 1;
    const depthScale = tapered ? shapeTaperScaleAt(shape, normalizedHeight, "depth") : 1;
    let localX = positions[index] * scaleX * widthScale;
    let localZ = positions[index + 2] * scaleZ * depthScale;
    if (deformed) {
      const deform = shapeExtrudeDeformAt(shape, normalizedHeight);
      const cos = Math.cos(deform.twistRadians);
      const sin = Math.sin(deform.twistRadians);
      const twistedX = localX * cos - localZ * sin;
      const twistedZ = localX * sin + localZ * cos;
      localX = twistedX + deform.offsetX;
      localZ = twistedZ + deform.offsetZ;
    }
    point
      .set(localX, localY - shape.height / 2, localZ)
      .applyQuaternion(quaternion);
    projected.set(point.dot(xAxis), point.dot(yAxis), point.dot(zAxis));
    min.min(projected);
    max.max(projected);
  }

  if (![min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite)) {
    return null;
  }
  if (shapeCache.size >= 32) shapeCache.clear();
  shapeCache.set(axisKey, { min: min.clone(), max: max.clone() });
  return { min: min.add(centerOffset), max: max.add(centerOffset) };
}

export function projectShapeExtent(
  shape: WorkplaneShape,
  xAxis: THREE.Vector3,
  yAxis: THREE.Vector3,
  zAxis: THREE.Vector3,
  origin: THREE.Vector3,
): { min: THREE.Vector3; max: THREE.Vector3 } {
  const importedBounds = importedShapeProjectionBounds(shape, xAxis, yAxis, zAxis);
  if (importedBounds) {
    const originProjection = new THREE.Vector3(origin.dot(xAxis), origin.dot(yAxis), origin.dot(zAxis));
    return { min: importedBounds.min.sub(originProjection), max: importedBounds.max.sub(originProjection) };
  }
  const center = shapeCenter(shape);
  const extents = shapeLocalExtents(shape);
  const shapeQuaternion = quaternionForShape(shape);
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  [-1, 1].forEach((xSign) => {
    [-1, 1].forEach((ySign) => {
      [-1, 1].forEach((zSign) => {
        const point = new THREE.Vector3(xSign * extents.x, ySign * extents.y, zSign * extents.z).applyQuaternion(shapeQuaternion).add(center);
        const local = point.sub(origin);
        local.set(local.dot(xAxis), local.dot(yAxis), local.dot(zAxis));
        min.min(local);
        max.max(local);
      });
    });
  });
  return { min, max };
}

/** Gemeinsame Umrissbox mehrerer Formen in denselben Achsen - mehrere markierte Koerper zaehlen am Lineal wie einer. */
export function projectShapesExtent(
  shapes: WorkplaneShape[],
  xAxis: THREE.Vector3,
  yAxis: THREE.Vector3,
  zAxis: THREE.Vector3,
  origin: THREE.Vector3,
): { min: THREE.Vector3; max: THREE.Vector3 } {
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  shapes.forEach((shape) => {
    const extent = projectShapeExtent(shape, xAxis, yAxis, zAxis, origin);
    min.min(extent.min);
    max.max(extent.max);
  });
  return { min, max };
}

export type OriginDimensionFrame = {
  origin: THREE.Vector3;
  distanceX: number | null;
  distanceZ: number | null;
  xEndpoint: THREE.Vector3 | null;
  zEndpoint: THREE.Vector3 | null;
};

export function setObjectRenderLayer(object: THREE.Object3D, layer: number) {
  object.traverse((child) => child.layers.set(layer));
}

export function freezeStaticObjectMatrices(object: THREE.Object3D) {
  object.traverse((child) => {
    child.updateMatrix();
    child.matrixAutoUpdate = false;
  });
  object.updateMatrixWorld(true);
}

export const formatMeasure = formatLengthMm;

export function findShapeObject(state: ThreeState, id: string) {
  return state.shapeRecords.get(id)?.object ?? null;
}

function disposeSharedShapeGeometry(geometry: THREE.BufferGeometry) {
  const edges = sharedEdgesGeometryCache.get(geometry);
  edges?.forEach((entry) => entry.dispose());
  if ((geometry as THREE.BufferGeometry & { boundsTree?: unknown }).boundsTree) {
    disposeBoundsTree.call(geometry);
  }
  geometry.dispose();
}

export function trimSharedShapeGeometryCache() {
  while (sharedShapeGeometryCache.size > MAX_SHARED_SHAPE_GEOMETRIES) {
    const removable = [...sharedShapeGeometryCache.entries()].find(([, entry]) => entry.users === 0);
    if (!removable) return;
    const [key, entry] = removable;
    sharedShapeGeometryCache.delete(key);
    disposeSharedShapeGeometry(entry.geometry);
  }
}

export function releaseSharedShapeGeometry(mesh: THREE.Mesh | THREE.LineSegments) {
  const key = mesh.userData.sharedShapeGeometryKey as string | undefined;
  if (!key) return;
  mesh.userData.sharedShapeGeometryKey = undefined;
  const entry = sharedShapeGeometryCache.get(key);
  if (entry && entry.geometry === mesh.geometry) {
    entry.users = Math.max(0, entry.users - 1);
  }
  trimSharedShapeGeometryCache();
}

export function trimSharedShapeMaterialCache() {
  while (sharedShapeMaterialCache.size > MAX_SHARED_SHAPE_MATERIALS) {
    const removable = [...sharedShapeMaterialCache.entries()].find(([, entry]) => entry.users === 0);
    if (!removable) return;
    const [key, entry] = removable;
    sharedShapeMaterialCache.delete(key);
    entry.material.dispose();
  }
}

export function releaseSharedShapeMaterials(mesh: THREE.Mesh | THREE.LineSegments) {
  const keys = mesh.userData.sharedShapeMaterialKeys as string[] | undefined;
  if (!keys?.length) return;
  mesh.userData.sharedShapeMaterialKeys = [];
  keys.forEach((key) => {
    const entry = sharedShapeMaterialCache.get(key);
    if (entry) entry.users = Math.max(0, entry.users - 1);
  });
}

export function disposeMaterialResource(material: THREE.Material) {
  if (material.userData.cached) return;
  const map = "map" in material ? (material.map as THREE.Texture | null) : null;
  if (map) map.dispose();
  material.dispose();
}

export function disposeChildren(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[group.children.length - 1];
    if (child) {
      group.remove(child);
      disposeObject(child);
    }
  }
}

export function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh | THREE.LineSegments;
    if ("geometry" in mesh && mesh.geometry) {
      releaseSharedShapeGeometry(mesh);
      if (!mesh.geometry.userData.cached) {
        if ((mesh.geometry as THREE.BufferGeometry & { boundsTree?: unknown }).boundsTree) {
          disposeBoundsTree.call(mesh.geometry);
        }
        mesh.geometry.dispose();
      }
    }
    if ("material" in mesh && mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      releaseSharedShapeMaterials(mesh);
      materials.forEach(disposeMaterialResource);
      trimSharedShapeMaterialCache();
    }
  });
}
