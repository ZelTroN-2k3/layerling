import { describe, expect, it } from "vitest";
import { isLocalRequest } from "@/lib/layerlingMcpLocalRequest";

function request(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { method: "POST", headers });
}

describe("isLocalRequest", () => {
  it("accepts a request with no origin header", () => {
    expect(isLocalRequest(request("http://localhost:3000/api/layerling-mcp"))).toBe(true);
  });

  it("accepts a matching localhost origin", () => {
    expect(isLocalRequest(request("http://localhost:3000/api/layerling-mcp", { origin: "http://localhost:3000" }))).toBe(true);
  });

  // The editor page can be opened as either loopback address; the port is
  // what ties a request back to the same running dev server, not the exact
  // hostname spelling.
  it("accepts 127.0.0.1 talking to a request the server reports as localhost", () => {
    expect(isLocalRequest(request("http://localhost:3000/api/layerling-mcp", { origin: "http://127.0.0.1:3000" }))).toBe(true);
  });

  it("accepts localhost talking to a request the server reports as 127.0.0.1", () => {
    expect(isLocalRequest(request("http://127.0.0.1:3000/api/layerling-mcp", { origin: "http://localhost:3000" }))).toBe(true);
  });

  it("rejects an origin on a different port", () => {
    expect(isLocalRequest(request("http://localhost:3000/api/layerling-mcp", { origin: "http://localhost:4000" }))).toBe(false);
  });

  it("rejects a non-local origin even on the same port", () => {
    expect(isLocalRequest(request("http://localhost:3000/api/layerling-mcp", { origin: "http://example.com:3000" }))).toBe(false);
  });

  it("rejects a request whose own host is not local", () => {
    expect(isLocalRequest(request("http://example.com:3000/api/layerling-mcp"))).toBe(false);
  });

  it("rejects a cross-site fetch even from a local origin", () => {
    expect(
      isLocalRequest(
        request("http://localhost:3000/api/layerling-mcp", { origin: "http://localhost:3000", "sec-fetch-site": "cross-site" }),
      ),
    ).toBe(false);
  });
});
