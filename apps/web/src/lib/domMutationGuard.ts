type GuardedNodePrototype = {
  removeChild: (this: Node, child: Node) => Node;
  insertBefore: (this: Node, node: Node, child: Node | null) => Node;
};

/**
 * Keeps the page from crashing when something outside layerling rearranges it - Chrome's
 * Translate above all, which swaps text for its own elements, or an extension. React then asks
 * to remove a node, or insert before one, that is no longer where it left it, and the browser
 * throws ("Failed to execute 'insertBefore' on 'Node'", #186). Here such a call is skipped with
 * a warning instead: a node that is no longer there is not removed, and a new node whose
 * neighbour has gone is put at the end. Everything else passes through unchanged.
 *
 * It is self-contained, so it can run as an inline script before React starts.
 */
export function installDomMutationGuard(prototype: GuardedNodePrototype) {
  const marked = prototype as GuardedNodePrototype & { __layerlingGuarded?: boolean };
  if (marked.__layerlingGuarded) return;
  marked.__layerlingGuarded = true;
  const removeChild = prototype.removeChild;
  prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      console.warn("layerling: skipped removing a node that something outside the page had moved", child);
      return child;
    }
    return removeChild.call(this, child);
  };
  const insertBefore = prototype.insertBefore;
  prototype.insertBefore = function (node, child) {
    if (child && child.parentNode !== this) {
      console.warn("layerling: the node to insert before was moved by something outside the page; appending instead", child);
      return insertBefore.call(this, node, null);
    }
    return insertBefore.call(this, node, child);
  };
}

/** The guard as an inline script for the page's head. */
export const DOM_MUTATION_GUARD_SCRIPT = `(${installDomMutationGuard.toString()})(Node.prototype);`;
