/**
 * The CAD worker computes one request after another, and a fillet preview is
 * expensive: fillet, tessellate and serialise the B-Rep of the result and of
 * every component. Dragging the size slider used to post one request per step,
 * so on a slow machine the worker still worked through a queue minutes after
 * the slider had come to rest - which looks exactly like a frozen program.
 *
 * This queue keeps at most one preview in flight. Anything that arrives while
 * the worker is busy replaces the waiting payload instead of joining a line:
 * only the newest request is ever sent, because it is the only one whose
 * result anybody wants to see.
 */

export type CadPreviewSend<TPayload> = (payload: TPayload) => number | null;

export type CadPreviewDispatch =
  | { status: "sent"; requestId: number }
  | { status: "queued"; requestId: null }
  | { status: "failed"; requestId: null };

export type CadPreviewSettle =
  | { status: "sent"; requestId: number }
  | { status: "idle"; requestId: null }
  | { status: "failed"; requestId: null };

export type CadPreviewQueue<TPayload> = {
  /** The request the worker is chewing on right now, if any. */
  readonly inFlightId: number | null;
  /** The payload waiting for that request to come back, if any. */
  readonly queuedPayload: TPayload | null;
  /** Send now, or replace whatever is waiting. */
  request: (payload: TPayload) => CadPreviewDispatch;
  /** Report that a result or an error for `requestId` arrived; sends the waiting payload. */
  settle: (requestId: number) => CadPreviewSettle;
  /** Forget everything - for a restarted worker or a discarded session. */
  reset: () => void;
};

export function createCadPreviewQueue<TPayload>(send: CadPreviewSend<TPayload>): CadPreviewQueue<TPayload> {
  let inFlightId: number | null = null;
  let queuedPayload: TPayload | null = null;
  let queued = false;

  const dispatch = (payload: TPayload): CadPreviewDispatch => {
    const requestId = send(payload);
    if (requestId === null) {
      inFlightId = null;
      return { status: "failed", requestId: null };
    }
    inFlightId = requestId;
    return { status: "sent", requestId };
  };

  return {
    get inFlightId() {
      return inFlightId;
    },
    get queuedPayload() {
      return queued ? queuedPayload : null;
    },
    request(payload) {
      if (inFlightId !== null) {
        queuedPayload = payload;
        queued = true;
        return { status: "queued", requestId: null };
      }
      return dispatch(payload);
    },
    settle(requestId) {
      if (inFlightId !== null && requestId !== inFlightId) return { status: "idle", requestId: null };
      inFlightId = null;
      if (!queued) return { status: "idle", requestId: null };
      const payload = queuedPayload as TPayload;
      queuedPayload = null;
      queued = false;
      const result = dispatch(payload);
      return result.status === "sent" ? result : { status: "failed", requestId: null };
    },
    reset() {
      inFlightId = null;
      queuedPayload = null;
      queued = false;
    },
  };
}
