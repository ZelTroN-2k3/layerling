import { NextResponse } from "next/server";
import type { LayerlingMcpApiPayload } from "@/lib/layerlingMcpProtocol";
import {
  completeLayerlingMcpCommand,
  dispatchLayerlingMcpCommand,
  listLayerlingMcpEditors,
  registerLayerlingMcpEditor,
  waitForLayerlingMcpCommand,
} from "@/lib/layerlingMcpStore";
import { LAYERLING_MCP_LONG_POLL_TIMEOUT_MS } from "@/lib/layerlingMcpProtocol";
import { isLocalRequest } from "@/lib/layerlingMcpLocalRequest";
import { authorizeRemoteRequest, mcpRemoteEnabled, mcpRemoteSettings, type McpRole } from "@/lib/layerlingMcpRemote";

export const revalidate = false;

/**
 * Who may use the bridge. Where the server switched remote use on
 * (LAYERLING_MCP_REMOTE and LAYERLING_MCP_TOKEN, read per request so the
 * ready-made image needs no rebuild) the MCP client brings the token and an
 * editor page has to be a page of this very site; see layerlingMcpRemote.ts.
 * Otherwise the bridge is for localhost in development only.
 */
function localOnly(request: Request, role: McpRole = "client") {
  const remote = mcpRemoteSettings();
  if (remote.requested) {
    const access = authorizeRemoteRequest(request, role, remote);
    return access.ok ? null : NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "layerling MCP is only available in local development." }, { status: 404 });
  }
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: "layerling MCP only accepts localhost requests." }, { status: 403 });
  }
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function GET(request: Request) {
  // Whether editors should connect at all; says nothing else, so it needs no token.
  if (new URL(request.url).searchParams.has("status")) {
    return NextResponse.json({ remote: mcpRemoteEnabled() });
  }
  const blocked = localOnly(request);
  if (blocked) return blocked;
  return NextResponse.json({ editors: listLayerlingMcpEditors() });
}

export async function POST(request: Request) {
  let body: LayerlingMcpApiPayload | null = null;
  try {
    body = (await request.json()) as LayerlingMcpApiPayload;
  } catch {
    body = null;
  }

  // Open editor pages heartbeat, poll and answer; whoever commands them is the MCP client.
  const role: McpRole = isObject(body) && (body.type === "heartbeat" || body.type === "poll" || body.type === "result") ? "editor" : "client";
  const blocked = localOnly(request, role);
  if (blocked) return blocked;

  if (!isObject(body) || typeof body.type !== "string") {
    return NextResponse.json({ error: "Invalid layerling MCP request." }, { status: 400 });
  }

  if (body.type === "heartbeat") {
    if (!isObject(body.editor)) {
      return NextResponse.json({ error: "Invalid editor heartbeat." }, { status: 400 });
    }
    registerLayerlingMcpEditor(body.editor);
    return NextResponse.json({ ok: true, editors: listLayerlingMcpEditors() });
  }

  if (body.type === "poll") {
    if (typeof body.editorId !== "string") {
      return NextResponse.json({ error: "Invalid editor poll." }, { status: 400 });
    }
    const command = await waitForLayerlingMcpCommand(body.editorId, {
      timeoutMs: LAYERLING_MCP_LONG_POLL_TIMEOUT_MS,
      signal: request.signal,
    });
    return NextResponse.json({ command });
  }

  if (body.type === "result") {
    if (typeof body.editorId !== "string" || !isObject(body.result) || typeof body.result.commandId !== "string" || typeof body.result.ok !== "boolean") {
      return NextResponse.json({ error: "Invalid command result." }, { status: 400 });
    }
    return NextResponse.json({ ok: completeLayerlingMcpCommand(body.editorId, body.result) });
  }

  if (body.type === "command") {
    if (typeof body.action !== "string") {
      return NextResponse.json({ error: "Invalid command action." }, { status: 400 });
    }
    const result = await dispatchLayerlingMcpCommand({
      editorId: typeof body.editorId === "string" ? body.editorId : undefined,
      editorNumber: typeof body.editorNumber === "number" ? body.editorNumber : undefined,
      action: body.action,
      params: isObject(body.params) ? body.params : {},
      timeoutMs: typeof body.timeoutMs === "number" ? body.timeoutMs : undefined,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 504 });
  }

  return NextResponse.json({ error: "Unknown layerling MCP request." }, { status: 400 });
}
