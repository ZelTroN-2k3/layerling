import { describe, expect, it } from "vitest";
import { supportNudgeDue, supportNudgeFirstVisitStamp, SUPPORT_NUDGE_INTERVAL_DAYS } from "@/lib/supportNudge";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 7);

describe("supportNudgeDue", () => {
  it("never asks on a first visit, which only starts the clock", () => {
    expect(supportNudgeDue(null, NOW)).toBe(false);
  });

  it("stays quiet for two weeks and is due from the fourteenth day on", () => {
    expect(SUPPORT_NUDGE_INTERVAL_DAYS).toBe(14);
    expect(supportNudgeDue(NOW - 13 * DAY, NOW)).toBe(false);
    expect(supportNudgeDue(NOW - 14 * DAY, NOW)).toBe(true);
    expect(supportNudgeDue(NOW - 90 * DAY, NOW)).toBe(true);
  });

  it("has a first visit fall due after three days, then every two weeks", () => {
    const stamp = supportNudgeFirstVisitStamp(NOW);
    expect(supportNudgeDue(stamp, NOW)).toBe(false);
    expect(supportNudgeDue(stamp, NOW + 2 * DAY)).toBe(false);
    expect(supportNudgeDue(stamp, NOW + 3 * DAY)).toBe(true);
  });

  it("ignores a stored time from the future or garbage", () => {
    expect(supportNudgeDue(NOW + 5 * DAY, NOW)).toBe(false);
    expect(supportNudgeDue(Number.NaN, NOW)).toBe(false);
  });
});
