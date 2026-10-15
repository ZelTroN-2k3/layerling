import type {
  LayerlingMcpCommand,
  LayerlingMcpCommandName,
  LayerlingMcpCommandResult,
  LayerlingMcpEditorSummary,
} from "@/lib/layerlingMcpProtocol";
import { LAYERLING_MCP_STALE_MS } from "@/lib/layerlingMcpProtocol";

type PendingCommand = {
  editorId: string;
  resolve: (value: LayerlingMcpCommandResult) => void;
  timer: ReturnType<typeof setTimeout>;
};

type PollWaiter = {
  resolve: (command: LayerlingMcpCommand | null) => void;
  timer: ReturnType<typeof setTimeout>;
  signal?: AbortSignal;
  onAbort?: () => void;
};

type LayerlingMcpStore = {
  editors: Map<string, LayerlingMcpEditorSummary>;
  queues: Map<string, LayerlingMcpCommand[]>;
  pending: Map<string, PendingCommand>;
  pollWaiters: Map<string, PollWaiter>;
};

declare global {
  // eslint-disable-next-line no-var
  var __layerlingMcpStore: LayerlingMcpStore | undefined;
}

function store() {
  const state = globalThis.__layerlingMcpStore ??= {
    editors: new Map<string, LayerlingMcpEditorSummary>(),
    queues: new Map<string, LayerlingMcpCommand[]>(),
    pending: new Map<string, PendingCommand>(),
    pollWaiters: new Map<string, PollWaiter>(),
  };
  // Development hot reload can preserve a store created before pollWaiters
  // existed. Initialize it lazily so an already-open editor keeps working.
  state.pollWaiters ??= new Map<string, PollWaiter>();
  return state;
}

function createCommandId() {
  return globalThis.crypto?.randomUUID?.() ?? `layerling-mcp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function settlePollWaiter(
  state: LayerlingMcpStore,
  editorId: string,
  waiter: PollWaiter,
  command: LayerlingMcpCommand | null,
) {
  if (state.pollWaiters.get(editorId) !== waiter) return false;
  state.pollWaiters.delete(editorId);
  clearTimeout(waiter.timer);
  if (waiter.signal && waiter.onAbort) {
    waiter.signal.removeEventListener("abort", waiter.onAbort);
  }
  waiter.resolve(command);
  return true;
}

function prune(current = Date.now()) {
  const state = store();
  for (const [editorId, editor] of state.editors) {
    if (state.pollWaiters.has(editorId) || current - editor.lastSeen <= LAYERLING_MCP_STALE_MS) {
      continue;
    }
    state.editors.delete(editorId);
    state.queues.delete(editorId);
    for (const [commandId, pending] of state.pending) {
      if (pending.editorId !== editorId) {
        continue;
      }
      clearTimeout(pending.timer);
      state.pending.delete(commandId);
      pending.resolve({
        commandId,
        ok: false,
        error: `Layerling editor ${editor.editorNumber} is no longer open`,
        completedAt: current,
      });
    }
  }
}

export function registerLayerlingMcpEditor(editor: Omit<LayerlingMcpEditorSummary, "lastSeen">) {
  const current = Date.now();
  prune(current);
  const state = store();
  state.editors.set(editor.editorId, { ...editor, lastSeen: current });
  state.queues.set(editor.editorId, state.queues.get(editor.editorId) ?? []);
}

export function listLayerlingMcpEditors() {
  prune();
  return [...store().editors.values()].sort((a, b) => a.editorNumber - b.editorNumber);
}

export function pollLayerlingMcpCommand(editorId: string) {
  prune();
  const queue = store().queues.get(editorId);
  return queue?.shift() ?? null;
}

export function waitForLayerlingMcpCommand(
  editorId: string,
  { timeoutMs, signal }: { timeoutMs: number; signal?: AbortSignal },
) {
  const state = store();
  const current = Date.now();
  const editor = state.editors.get(editorId);
  if (editor) state.editors.set(editorId, { ...editor, lastSeen: current });
  prune(current);
  const queued = state.queues.get(editorId)?.shift();
  if (queued) return Promise.resolve(queued);
  if (signal?.aborted) return Promise.resolve(null);

  const existing = state.pollWaiters.get(editorId);
  if (existing) settlePollWaiter(state, editorId, existing, null);

  return new Promise<LayerlingMcpCommand | null>((resolve) => {
    let waiter: PollWaiter;
    const timer = setTimeout(() => settlePollWaiter(state, editorId, waiter, null), Math.max(1_000, Math.min(timeoutMs, 30_000)));
    const onAbort = () => settlePollWaiter(state, editorId, waiter, null);
    waiter = { resolve, timer, signal, onAbort };
    state.pollWaiters.set(editorId, waiter);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function completeLayerlingMcpCommand(editorId: string, result: LayerlingMcpCommandResult) {
  const state = store();
  const pending = state.pending.get(result.commandId);
  if (!pending || pending.editorId !== editorId) {
    return false;
  }
  clearTimeout(pending.timer);
  state.pending.delete(result.commandId);
  pending.resolve({ ...result, completedAt: result.completedAt ?? Date.now() });
  return true;
}

export function dispatchLayerlingMcpCommand({
  editorId,
  editorNumber,
  action,
  params = {},
  timeoutMs = 15000,
}: {
  editorId?: string;
  editorNumber?: number;
  action: LayerlingMcpCommandName;
  params?: Record<string, unknown>;
  timeoutMs?: number;
}) {
  prune();
  const state = store();
  const editor =
    (editorId ? state.editors.get(editorId) : null) ??
    (typeof editorNumber === "number" ? [...state.editors.values()].find((candidate) => candidate.editorNumber === editorNumber) : null);
  if (!editor) {
    return Promise.resolve({
      commandId: "",
      ok: false,
      error: typeof editorNumber === "number" ? `No open Layerling editor ${editorNumber}` : "No matching open Layerling editor",
      completedAt: Date.now(),
    } satisfies LayerlingMcpCommandResult);
  }

  const command: LayerlingMcpCommand = {
    id: createCommandId(),
    action,
    params,
    createdAt: Date.now(),
  };
  const waiter = state.pollWaiters.get(editor.editorId);
  if (!waiter || !settlePollWaiter(state, editor.editorId, waiter, command)) {
    const queue = state.queues.get(editor.editorId) ?? [];
    queue.push(command);
    state.queues.set(editor.editorId, queue);
  }

  return new Promise<LayerlingMcpCommandResult>((resolve) => {
    const timer = setTimeout(() => {
      state.pending.delete(command.id);
      resolve({
        commandId: command.id,
        ok: false,
        error: `Timed out waiting for Layerling editor ${editor.editorNumber}`,
        completedAt: Date.now(),
      });
    }, Math.max(1000, Math.min(timeoutMs, 60000)));
    state.pending.set(command.id, { editorId: editor.editorId, resolve, timer });
  });
}
