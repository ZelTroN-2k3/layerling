import { describe, expect, it, vi } from "vitest";
import { DOM_MUTATION_GUARD_SCRIPT, installDomMutationGuard } from "@/lib/domMutationGuard";

// A tiny stand-in for DOM nodes: enough to see what reaches the real methods.
class FakeNode {
  parentNode: FakeNode | null = null;
  children: FakeNode[] = [];
  removeChild(child: FakeNode) {
    if (child.parentNode !== this) throw new Error("NotFoundError: removeChild");
    this.children = this.children.filter((entry) => entry !== child);
    child.parentNode = null;
    return child;
  }
  insertBefore(node: FakeNode, child: FakeNode | null) {
    if (child && child.parentNode !== this) throw new Error("NotFoundError: insertBefore");
    // Like the DOM: a node that is inserted leaves its old parent.
    if (node.parentNode) node.parentNode.children = node.parentNode.children.filter((entry) => entry !== node);
    const index = child ? this.children.indexOf(child) : this.children.length;
    this.children.splice(index, 0, node);
    node.parentNode = this;
    return node;
  }
}

function guarded() {
  class Node extends FakeNode {}
  installDomMutationGuard(Node.prototype as never);
  return Node;
}

describe("the guard against pages rearranged from outside (#186)", () => {
  it("passes normal calls through", () => {
    const Node = guarded();
    const parent = new Node();
    const a = new Node();
    const b = new Node();
    parent.insertBefore(a, null);
    parent.insertBefore(b, a);
    expect(parent.children).toEqual([b, a]);
    parent.removeChild(b);
    expect(parent.children).toEqual([a]);
  });

  it("appends instead of throwing when the neighbour was moved away", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const Node = guarded();
    const parent = new Node();
    const moved = new Node();
    const fresh = new Node();
    parent.insertBefore(moved, null);
    // Translate wraps the text in its own element: the node now lives elsewhere.
    new Node().insertBefore(moved, null);
    expect(() => parent.insertBefore(fresh, moved)).not.toThrow();
    expect(parent.children).toEqual([fresh]);
    expect(() => parent.removeChild(moved)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("installs only once, and works as an inline script", () => {
    const Node = guarded();
    const first = Node.prototype.insertBefore;
    installDomMutationGuard(Node.prototype as never);
    expect(Node.prototype.insertBefore).toBe(first);
    expect(DOM_MUTATION_GUARD_SCRIPT).toMatch(/^\(function installDomMutationGuard|^\(function /);
    expect(DOM_MUTATION_GUARD_SCRIPT.endsWith("(Node.prototype);")).toBe(true);
    // The script stands on its own: it runs against a prototype handed to it.
    class Other extends FakeNode {}
    new Function("Node", DOM_MUTATION_GUARD_SCRIPT)(Other);
    expect((Other.prototype as unknown as { __layerlingGuarded?: boolean }).__layerlingGuarded).toBe(true);
  });
});
