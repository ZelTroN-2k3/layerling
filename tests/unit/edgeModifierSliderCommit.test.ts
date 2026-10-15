// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// #204: leaving the radius field without a change reported the same value again; the edge
// tool threw its preview away for it and nothing computed a new one, so Apply spun for good.
describe("the edge tool's number field", () => {
  let container: HTMLDivElement | null = null;
  afterEach(() => {
    container?.remove();
    container = null;
  });

  const mount = (onChange: (value: number) => void) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(EdgeModifierSlider, {
        label: "Radius",
        value: 3,
        min: 0.1,
        max: 20,
        step: 0.1,
        workspace: DEFAULT_WORKPLANE_WORKSPACE,
        length: true,
        onChange,
      }));
    });
    return container.querySelector<HTMLInputElement>("input[type=text]")!;
  };

  it("reports nothing when the field is left unchanged", () => {
    const onChange = vi.fn();
    const input = mount(onChange);
    act(() => input.focus());
    act(() => input.blur());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("still reports a typed value", () => {
    const onChange = vi.fn();
    const input = mount(onChange);
    act(() => input.focus());
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "4");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => input.blur());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
