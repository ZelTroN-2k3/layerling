/** How long the reminder stays quiet after it was shown and answered. */
export const SUPPORT_NUDGE_INTERVAL_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A browser that has never seen the reminder gets it for the first time after this many days. */
export const SUPPORT_NUDGE_FIRST_DAYS = 3;

/**
 * The time to store on a first visit: back-dated so that the reminder falls due
 * after SUPPORT_NUDGE_FIRST_DAYS instead of a full interval.
 */
export function supportNudgeFirstVisitStamp(now: number): number {
  return now - (SUPPORT_NUDGE_INTERVAL_DAYS - SUPPORT_NUDGE_FIRST_DAYS) * DAY_MS;
}

/**
 * Whether the reminder about supporting the project is due. `lastAnswered` is the
 * time the person last closed it or followed it (milliseconds), or null for a
 * browser that has never seen it. A first visit is never due: it only starts the
 * clock, so nobody is asked before they have had a few days with the program.
 * A clock that ran backwards (stored time in the future) counts as not due.
 */
export function supportNudgeDue(lastAnswered: number | null, now: number): boolean {
  if (lastAnswered === null || !Number.isFinite(lastAnswered)) return false;
  return now - lastAnswered >= SUPPORT_NUDGE_INTERVAL_DAYS * DAY_MS;
}
