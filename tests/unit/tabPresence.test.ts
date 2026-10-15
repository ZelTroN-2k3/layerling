import { describe, expect, it } from "vitest";
import { isTabPresenceMessage, tabPresenceState, type TabPeer } from "@/lib/tabPresence";

const peers = (...entries: Array<[string, TabPeer]>) => new Map(entries);

describe("tab presence", () => {
  it("stays quiet when no other tab is open, or later tabs run the same version on other designs", () => {
    expect(tabPresenceState(peers(), "1.34.0", "a", 100)).toEqual({ newerVersion: null, sameProjectElsewhere: false, openedAfterAnother: false });
    expect(tabPresenceState(peers(["t1", { version: "1.34.0", projectId: "b", startedAt: 200 }]), "1.34.0", "a", 100))
      .toEqual({ newerVersion: null, sameProjectElsewhere: false, openedAfterAnother: false });
  });

  it("names the newest version another tab runs, only when it is newer than this one", () => {
    const others = peers(["t1", { version: "1.35.0", projectId: null }], ["t2", { version: "1.36.1", projectId: null }], ["t3", { version: "1.33.0", projectId: null }]);
    expect(tabPresenceState(others, "1.34.0", null, 100).newerVersion).toBe("1.36.1");
    expect(tabPresenceState(others, "1.37.0", null, 100).newerVersion).toBeNull();
  });

  it("warns when another tab has the design open that this tab edits, not on the start page", () => {
    const others = peers(["t1", { version: "1.34.0", projectId: "a" }]);
    expect(tabPresenceState(others, "1.34.0", "a", 100).sameProjectElsewhere).toBe(true);
    expect(tabPresenceState(others, "1.34.0", null, 100).sameProjectElsewhere).toBe(false);
    expect(tabPresenceState(peers(["t1", { version: "1.34.0", projectId: null }]), "1.34.0", null, 100).sameProjectElsewhere).toBe(false);
  });

  it("tells only the later tab that another one was open first (#102)", () => {
    const first = peers(["t1", { version: "1.35.1", projectId: null, startedAt: 100 }]);
    expect(tabPresenceState(first, "1.35.1", null, 200).openedAfterAnother).toBe(true);
    const later = peers(["t2", { version: "1.35.1", projectId: null, startedAt: 200 }]);
    expect(tabPresenceState(later, "1.35.1", null, 100).openedAfterAnother).toBe(false);
    // A tab from before 1.35.1 sends no start time; it was there first.
    expect(tabPresenceState(peers(["t0", { version: "1.35.0", projectId: null }]), "1.35.1", null, 100).openedAfterAnother).toBe(true);
  });

  it("takes only well-formed messages from the channel", () => {
    expect(isTabPresenceMessage({ kind: "hello", tabId: "x", version: "1.34.0", projectId: null })).toBe(true);
    expect(isTabPresenceMessage({ kind: "here", tabId: "x", version: "1.34.0", projectId: "a" })).toBe(true);
    expect(isTabPresenceMessage({ kind: "here", tabId: "x", version: "1.35.1", projectId: null, startedAt: 5 })).toBe(true);
    expect(isTabPresenceMessage({ kind: "here", tabId: "x", version: "1.35.1", projectId: null, startedAt: "5" })).toBe(false);
    expect(isTabPresenceMessage({ kind: "bye", tabId: "x" })).toBe(true);
    expect(isTabPresenceMessage({ kind: "ask", tabId: "guide-x" })).toBe(true);
    expect(isTabPresenceMessage({ kind: "ask" })).toBe(false);
    expect(isTabPresenceMessage({ kind: "hello", tabId: "x", version: 1, projectId: null })).toBe(false);
    expect(isTabPresenceMessage({ kind: "other", tabId: "x" })).toBe(false);
    expect(isTabPresenceMessage(null)).toBe(false);
    expect(isTabPresenceMessage("hello")).toBe(false);
  });
});
