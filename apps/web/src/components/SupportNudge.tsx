"use client";

import { Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { supportNudgeDue, supportNudgeFirstVisitStamp } from "@/lib/supportNudge";
import { useLanguage } from "@/lib/useLanguage";

const ANSWERED_KEY = "layerling.supportNudgeAnswered";
/** Not at the very start: the card appears once someone has been working for a while. */
const SHOW_DELAY_MS = 45_000;

function readAnswered(): number | null {
  try {
    const stored = Number(window.localStorage.getItem(ANSWERED_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  } catch {
    return null;
  }
}

function writeAnswered(now: number) {
  try {
    window.localStorage.setItem(ANSWERED_KEY, String(now));
  } catch {
    // Without storage the reminder simply comes back with the next visit.
  }
}

/**
 * A small card, at most every two weeks per browser, that points at the way to
 * support the project. It only exists where the operator configured a support
 * address, so self-hosted installations never show it. The first visit starts
 * the clock without showing anything; the first reminder follows after three days.
 */
export function SupportNudge({ href }: { href: string }) {
  useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const answered = readAnswered();
    if (answered === null) {
      writeAnswered(supportNudgeFirstVisitStamp(now));
      return;
    }
    if (!supportNudgeDue(answered, now)) return;
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const answer = () => {
    setVisible(false);
    writeAnswered(Date.now());
  };

  return (
    <aside className="support-nudge" aria-label={t("supportNudge.title")}>
      <span className="support-nudge-icon" aria-hidden="true">
        <Heart size={18} strokeWidth={2.4} />
      </span>
      <div className="support-nudge-text">
        <strong>{t("supportNudge.title")}</strong>
        <span>{t("supportNudge.body")}</span>
        <a className="support-nudge-link" href={href} target="_blank" rel="noreferrer" onClick={answer}>
          {t("supportNudge.more")}
        </a>
      </div>
      <button className="support-nudge-close" type="button" aria-label={t("supportNudge.dismiss")} title={t("supportNudge.dismiss")} onClick={answer}>
        <X size={16} />
      </button>
    </aside>
  );
}
