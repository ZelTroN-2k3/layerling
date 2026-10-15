import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The MCP bridge lets whoever can drive it control the open editors: read the
 * design, change it, and - where the server keeps projects - save shapes there.
 * So it is off outside local development. A copy somebody hosts themselves (a
 * NAS, a home server, the Docker image) can switch it on at run time:
 *
 *   LAYERLING_MCP_REMOTE=true
 *   LAYERLING_MCP_TOKEN=<at least 16 characters>
 *
 * Both are read when a request arrives, so the ready-made image can use them
 * without a rebuild. Without a long enough token the bridge stays closed.
 */
export const MCP_TOKEN_MIN_LENGTH = 16;

export type McpRemoteSettings = {
  /** LAYERLING_MCP_REMOTE is on. */
  requested: boolean;
  /** The token is set and long enough. */
  tokenOk: boolean;
  token: string;
  /** Extra host names the editor may be opened under, for a reverse proxy with a real domain. */
  allowedHosts: string[];
};

type Environment = Record<string, string | undefined>;

export function mcpRemoteSettings(env: Environment = process.env): McpRemoteSettings {
  const flag = (env.LAYERLING_MCP_REMOTE ?? "").trim().toLowerCase();
  const token = (env.LAYERLING_MCP_TOKEN ?? "").trim();
  return {
    requested: flag === "true" || flag === "1",
    tokenOk: token.length >= MCP_TOKEN_MIN_LENGTH,
    token,
    allowedHosts: (env.LAYERLING_MCP_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((host) => hostOnly(host.trim()))
      .filter(Boolean),
  };
}

/** The bridge is open for remote use: asked for, and protected by a token. */
export function mcpRemoteEnabled(settings: McpRemoteSettings = mcpRemoteSettings()) {
  return settings.requested && settings.tokenOk;
}

/** "nas.local:3000" -> "nas.local", "[::1]:3000" -> "::1". */
export function hostOnly(host: string) {
  const value = host.trim().toLowerCase();
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end > 0 ? value.slice(1, end) : value;
  }
  const colons = value.split(":").length - 1;
  return colons === 1 ? value.slice(0, value.indexOf(":")) : value;
}

const PRIVATE_SUFFIXES = [".local", ".lan", ".home", ".internal", ".localdomain", ".home.arpa", ".localhost"];

/**
 * A name only someone on the same network can use: an address, a name without
 * a dot (what a NAS or router hands out), or one of the usual private
 * endings. A page on another site cannot point such a name at the NAS - it
 * would need a real domain, and this is what stops it from tricking the
 * browser into treating the NAS as its own site (DNS rebinding). A real
 * domain behind a reverse proxy goes into LAYERLING_MCP_ALLOWED_HOSTS.
 */
export function isPrivateStyleHost(host: string) {
  const name = hostOnly(host);
  if (!name) return false;
  if (name.includes(":")) return true; // IPv6 address
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(name)) return true;
  if (!name.includes(".")) return true;
  return PRIVATE_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

/** The host the browser asked for. Behind Docker or a proxy request.url says localhost, so the headers come first. */
export function requestedHost(request: Request) {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("host") || new URL(request.url).host;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function tokensMatch(given: string, expected: string) {
  if (!given || !expected) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : "";
}

/** "client" is the MCP server (it commands the editors), "editor" is a browser page of this copy. */
export type McpRole = "client" | "editor";

export type McpAccess = { ok: true } | { ok: false; status: number; error: string };

/**
 * Who may use the bridge once it is open for remote use. The MCP client needs
 * the token. An editor page needs no token (the browser has none to give), but
 * it has to be a page of this very site opened under a host name that is
 * private-style or allowed - or it brings the token too.
 */
export function authorizeRemoteRequest(request: Request, role: McpRole, settings: McpRemoteSettings = mcpRemoteSettings()): McpAccess {
  if (!settings.requested) {
    return { ok: false, status: 404, error: "layerling MCP remote access is not switched on." };
  }
  if (!settings.tokenOk) {
    return { ok: false, status: 503, error: `layerling MCP remote access needs LAYERLING_MCP_TOKEN with at least ${MCP_TOKEN_MIN_LENGTH} characters.` };
  }
  if (tokensMatch(bearerToken(request), settings.token)) {
    return { ok: true };
  }
  if (role === "client") {
    return { ok: false, status: 401, error: "layerling MCP needs the access token: set LAYERLING_MCP_TOKEN for the MCP client to the one the server uses." };
  }

  const host = requestedHost(request);
  const hostAllowed = isPrivateStyleHost(host) || settings.allowedHosts.includes(hostOnly(host));
  if (!hostAllowed) {
    return { ok: false, status: 403, error: "layerling MCP does not accept this host name. Add it to LAYERLING_MCP_ALLOWED_HOSTS." };
  }
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) {
        return { ok: false, status: 403, error: "layerling MCP rejects requests from other sites." };
      }
    } catch {
      return { ok: false, status: 403, error: "layerling MCP rejects requests from other sites." };
    }
  }
  // Browsers send Sec-Fetch-Site only to secure contexts (https or localhost). A copy on a NAS over plain
  // http://192.168.x.x gets none, so then the Origin header, which every browser sends on a POST, has to
  // be there and has matched the host above. Without either header it is not a browser page of this site.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite ? fetchSite !== "same-origin" : !origin) {
    return { ok: false, status: 403, error: "layerling MCP rejects requests from other sites." };
  }
  return { ok: true };
}
