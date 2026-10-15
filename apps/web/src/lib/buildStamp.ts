/**
 * Which build of layerling a piece of the program belongs to. The page and its CAD workers are
 * separate files that load at different times; after an update, or with a stored file from an
 * older build, they can end up from different builds. Every worker says which build it is the
 * moment it starts, and the page compares that with its own - a difference offers a reload
 * (hooks/useNewVersionNotice) before the two misunderstand each other.
 *
 * The value is set per build by scripts/build-static-export.mjs (LAYERLING_BUILD_ID) and is the
 * version number everywhere else, where page and workers always come from one build anyway.
 */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";

/** Sent by a worker as its very first message. */
export interface BuildMessage {
  type: "build";
  build: string;
}

export function buildMessage(): BuildMessage {
  return { type: "build", build: BUILD_ID };
}

export function isBuildMessage(value: unknown): value is BuildMessage {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "build" && typeof (value as { build?: unknown }).build === "string";
}

/** Two builds that are both known and not the same. */
export function buildsDiffer(page: string, other: string) {
  return page !== "" && other !== "" && page !== other;
}

export const BUILD_MISMATCH_EVENT = "layerling:build-mismatch";

/** What the page does with the build a worker reported: nothing when it is its own. */
export function reportWorkerBuild(message: BuildMessage) {
  if (typeof window === "undefined" || !buildsDiffer(BUILD_ID, message.build)) return;
  window.dispatchEvent(new CustomEvent(BUILD_MISMATCH_EVENT, { detail: { page: BUILD_ID, worker: message.build } }));
}
