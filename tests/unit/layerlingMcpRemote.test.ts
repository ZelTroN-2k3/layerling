import { describe, expect, it } from "vitest";
import {
  authorizeRemoteRequest,
  hostOnly,
  isPrivateStyleHost,
  mcpRemoteEnabled,
  mcpRemoteSettings,
} from "@/lib/layerlingMcpRemote";

const TOKEN = "a-long-secret-token-1234";
const ON = mcpRemoteSettings({ LAYERLING_MCP_REMOTE: "true", LAYERLING_MCP_TOKEN: TOKEN });

function request(headers: Record<string, string> = {}, url = "http://localhost:3000/api/layerling-mcp") {
  return new Request(url, { method: "POST", headers });
}

/** What a browser page of this copy sends: its own origin and "same-origin". */
function editorPage(host: string, extra: Record<string, string> = {}) {
  return request({ host, origin: `http://${host}`, "sec-fetch-site": "same-origin", ...extra });
}

describe("mcpRemoteSettings", () => {
  it("is off unless asked for", () => {
    expect(mcpRemoteSettings({}).requested).toBe(false);
    expect(mcpRemoteSettings({ LAYERLING_MCP_REMOTE: "false", LAYERLING_MCP_TOKEN: TOKEN }).requested).toBe(false);
    expect(mcpRemoteSettings({ LAYERLING_MCP_REMOTE: "TRUE" }).requested).toBe(true);
    expect(mcpRemoteSettings({ LAYERLING_MCP_REMOTE: "1" }).requested).toBe(true);
  });

  it("stays closed without a token of at least 16 characters", () => {
    expect(mcpRemoteEnabled(mcpRemoteSettings({ LAYERLING_MCP_REMOTE: "true" }))).toBe(false);
    expect(mcpRemoteEnabled(mcpRemoteSettings({ LAYERLING_MCP_REMOTE: "true", LAYERLING_MCP_TOKEN: "short" }))).toBe(false);
    expect(mcpRemoteEnabled(ON)).toBe(true);
    // The token alone does not open it.
    expect(mcpRemoteEnabled(mcpRemoteSettings({ LAYERLING_MCP_TOKEN: TOKEN }))).toBe(false);
  });

  it("reads the extra host names without ports and case", () => {
    const settings = mcpRemoteSettings({ LAYERLING_MCP_ALLOWED_HOSTS: " Layerling.Example.com:8443 , other.org " });
    expect(settings.allowedHosts).toEqual(["layerling.example.com", "other.org"]);
  });
});

describe("isPrivateStyleHost", () => {
  it("accepts addresses, names without a dot and the private endings", () => {
    for (const host of ["192.168.2.11:3000", "10.0.0.5", "localhost:3000", "[::1]:3000", "nas", "synology:3000", "nas.local", "layerling.lan", "box.home.arpa", "x.internal"]) {
      expect(isPrivateStyleHost(host), host).toBe(true);
    }
  });

  it("refuses a real domain, which is what a rebinding page would use", () => {
    for (const host of ["evil.com", "evil.com:3000", "192.168.2.11.evil.com", "nas.local.evil.org", ""]) {
      expect(isPrivateStyleHost(host), host).toBe(false);
    }
  });

  it("strips ports and brackets", () => {
    expect(hostOnly("NAS.local:3000")).toBe("nas.local");
    expect(hostOnly("[::1]:3000")).toBe("::1");
    expect(hostOnly("fe80::1")).toBe("fe80::1");
  });
});

describe("authorizeRemoteRequest", () => {
  it("answers 404 while remote use is off and 503 while the token is missing", () => {
    const off = mcpRemoteSettings({});
    expect(authorizeRemoteRequest(request(), "client", off)).toMatchObject({ ok: false, status: 404 });
    const noToken = mcpRemoteSettings({ LAYERLING_MCP_REMOTE: "true" });
    expect(authorizeRemoteRequest(request(), "client", noToken)).toMatchObject({ ok: false, status: 503 });
  });

  it("lets the MCP client in only with the token", () => {
    expect(authorizeRemoteRequest(request(), "client", ON)).toMatchObject({ ok: false, status: 401 });
    expect(authorizeRemoteRequest(request({ authorization: "Bearer wrong-token-wrong-token" }), "client", ON)).toMatchObject({ ok: false, status: 401 });
    expect(authorizeRemoteRequest(request({ authorization: `Bearer ${TOKEN}` }), "client", ON)).toEqual({ ok: true });
    // A browser page of this site does not command the editors without the token.
    expect(authorizeRemoteRequest(editorPage("192.168.2.11:3000"), "client", ON)).toMatchObject({ ok: false, status: 401 });
  });

  it("lets an editor page of this copy in without a token", () => {
    expect(authorizeRemoteRequest(editorPage("192.168.2.11:3000"), "editor", ON)).toEqual({ ok: true });
    expect(authorizeRemoteRequest(editorPage("nas.local:3000"), "editor", ON)).toEqual({ ok: true });
    // Next reports request.url as localhost inside Docker; the Host header says what the browser used.
    expect(authorizeRemoteRequest(editorPage("192.168.2.11:3000"), "editor", ON)).toEqual({ ok: true });
  });

  it("refuses a page under a real domain (DNS rebinding) unless the server lists it", () => {
    const rebound = editorPage("evil.com:3000");
    expect(authorizeRemoteRequest(rebound, "editor", ON)).toMatchObject({ ok: false, status: 403 });
    const listed = mcpRemoteSettings({ LAYERLING_MCP_REMOTE: "true", LAYERLING_MCP_TOKEN: TOKEN, LAYERLING_MCP_ALLOWED_HOSTS: "layerling.example.com" });
    expect(authorizeRemoteRequest(editorPage("layerling.example.com"), "editor", listed)).toEqual({ ok: true });
    expect(authorizeRemoteRequest(editorPage("evil.com"), "editor", listed)).toMatchObject({ ok: false, status: 403 });
  });

  it("prefers x-forwarded-host set by a reverse proxy", () => {
    const listed = mcpRemoteSettings({ LAYERLING_MCP_REMOTE: "true", LAYERLING_MCP_TOKEN: TOKEN, LAYERLING_MCP_ALLOWED_HOSTS: "layerling.example.com" });
    const proxied = request({ host: "localhost:3000", "x-forwarded-host": "layerling.example.com", origin: "https://layerling.example.com", "sec-fetch-site": "same-origin" });
    expect(authorizeRemoteRequest(proxied, "editor", listed)).toEqual({ ok: true });
  });

  it("accepts an editor page over plain http, where the browser sends an Origin but no Sec-Fetch-Site", () => {
    const plainHttp = request({ host: "192.168.2.11:3000", origin: "http://192.168.2.11:3000" });
    expect(authorizeRemoteRequest(plainHttp, "editor", ON)).toEqual({ ok: true });
    expect(authorizeRemoteRequest(request({ host: "192.168.2.11:3000", origin: "http://example.com" }), "editor", ON)).toMatchObject({ ok: false, status: 403 });
  });

  it("refuses another site's page and anything that is not a browser page", () => {
    expect(authorizeRemoteRequest(request({ host: "192.168.2.11:3000", origin: "http://example.com", "sec-fetch-site": "cross-site" }), "editor", ON)).toMatchObject({ ok: false, status: 403 });
    expect(authorizeRemoteRequest(request({ host: "192.168.2.11:3000", origin: "http://192.168.2.11:4000", "sec-fetch-site": "same-origin" }), "editor", ON)).toMatchObject({ ok: false, status: 403 });
    // Neither Fetch Metadata nor an Origin: not a browser page of this site.
    expect(authorizeRemoteRequest(request({ host: "192.168.2.11:3000" }), "editor", ON)).toMatchObject({ ok: false, status: 403 });
    // With the token, anything goes.
    expect(authorizeRemoteRequest(request({ host: "192.168.2.11:3000", authorization: `Bearer ${TOKEN}` }), "editor", ON)).toEqual({ ok: true });
  });
});
