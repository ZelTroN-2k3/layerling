// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function stamp(buildId: string | undefined) {
  vi.resetModules();
  if (buildId === undefined) vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "");
  else vi.stubEnv("NEXT_PUBLIC_BUILD_ID", buildId);
  return import("@/lib/buildStamp");
}

describe("which build a worker is from", () => {
  it("recognises the first message of a worker and nothing else", async () => {
    const { buildMessage, isBuildMessage } = await stamp("1760000000000");
    expect(buildMessage()).toEqual({ type: "build", build: "1760000000000" });
    expect(isBuildMessage(buildMessage())).toBe(true);
    // The answers of the CAD workers carry other types and a request id.
    expect(isBuildMessage({ type: "ready", requestId: 3 })).toBe(false);
    expect(isBuildMessage({ type: "build" })).toBe(false);
    expect(isBuildMessage(null)).toBe(false);
    expect(isBuildMessage("build")).toBe(false);
  });

  it("calls two known, different builds a mismatch - an unknown one never", async () => {
    const { buildsDiffer } = await stamp("a");
    expect(buildsDiffer("a", "b")).toBe(true);
    expect(buildsDiffer("a", "a")).toBe(false);
    expect(buildsDiffer("", "b")).toBe(false);
    expect(buildsDiffer("a", "")).toBe(false);
  });

  it("tells the page when a worker is from another build", async () => {
    const { BUILD_MISMATCH_EVENT, reportWorkerBuild } = await stamp("new-build");
    const heard = vi.fn();
    window.addEventListener(BUILD_MISMATCH_EVENT, heard);
    reportWorkerBuild({ type: "build", build: "new-build" });
    expect(heard).not.toHaveBeenCalled();
    reportWorkerBuild({ type: "build", build: "old-build" });
    expect(heard).toHaveBeenCalledTimes(1);
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({ page: "new-build", worker: "old-build" });
    window.removeEventListener(BUILD_MISMATCH_EVENT, heard);
  });

  it("stays quiet where the page has no build id (nothing to compare)", async () => {
    const { BUILD_MISMATCH_EVENT, reportWorkerBuild } = await stamp(undefined);
    const heard = vi.fn();
    window.addEventListener(BUILD_MISMATCH_EVENT, heard);
    reportWorkerBuild({ type: "build", build: "whatever" });
    expect(heard).not.toHaveBeenCalled();
    window.removeEventListener(BUILD_MISMATCH_EVENT, heard);
  });
});
