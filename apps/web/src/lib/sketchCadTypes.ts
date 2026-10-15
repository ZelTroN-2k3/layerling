import type { SketchProfile, SketchStroke } from "@/types/layerling";

export type SketchCadBuildRequest = {
  type: "build";
  requestId: number;
  profile: SketchProfile;
  height: number;
  /** Set for a revolve: the sketch is turned about the vertical axis instead of pulled up by `height`. */
  revolve?: { startAngle: number; sweepAngle: number };
  /** Set for a stroked or widened sketch: the kernel moves the outlines itself (cadSketchStroke.ts). */
  stroke?: SketchStroke;
};

/** The message of the error the worker answers with when a stroke is for the polygon route to build. */
export const SKETCH_STROKE_UNSUPPORTED = "stroke-unsupported";

export type SketchCadBuildResponse =
  | {
      type: "built";
      requestId: number;
      positions: Float32Array;
      normals: Float32Array;
      indices: Uint32Array;
      triangleCount: number;
      brep: string;
    }
  | { type: "error"; requestId: number; message: string };
