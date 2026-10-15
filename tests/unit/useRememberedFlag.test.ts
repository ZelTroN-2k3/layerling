// @vitest-environment jsdom
import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useRememberedFlag } from "@/lib/useRememberedFlag";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KEY = "layerling.test.flag";

/** Mounts the hook, hands back what it returns, and lets a test change the flag. */
function mount() {
  const host = document.createElement("div");
  const root = createRoot(host);
  const seen: { value: boolean; set: (next: boolean) => void }[] = [];
  function Probe() {
    const [value, setValue] = useRememberedFlag(KEY);
    useEffect(() => {
      seen.push({ value, set: setValue });
    });
    return null;
  }
  act(() => root.render(createElement(Probe)));
  return { latest: () => seen[seen.length - 1], unmount: () => act(() => root.unmount()) };
}

describe("a flag kept in the browser (#356)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("starts false, and that is what is stored until it is changed", () => {
    const probe = mount();
    expect(probe.latest().value).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBe("false");
    probe.unmount();
  });

  it("stays as it was left, also for the next page", () => {
    const first = mount();
    act(() => first.latest().set(true));
    expect(first.latest().value).toBe(true);
    expect(window.localStorage.getItem(KEY)).toBe("true");
    first.unmount();

    const second = mount();
    expect(second.latest().value).toBe(true);
    act(() => second.latest().set(false));
    second.unmount();

    expect(mount().latest().value).toBe(false);
  });

  it("does not let its start value overwrite what is stored", () => {
    window.localStorage.setItem(KEY, "true");
    const probe = mount();
    expect(probe.latest().value).toBe(true);
    expect(window.localStorage.getItem(KEY)).toBe("true");
    probe.unmount();
  });

  it("works when the storage is blocked", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage")!;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    try {
      const probe = mount();
      expect(probe.latest().value).toBe(false);
      act(() => probe.latest().set(true));
      expect(probe.latest().value).toBe(true);
      probe.unmount();
    } finally {
      Object.defineProperty(window, "localStorage", original);
    }
  });
});
