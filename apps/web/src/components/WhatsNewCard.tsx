"use client";

import { Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { localizedText, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { WhatsNewView } from "@/lib/useWhatsNew";
import { whatsNewBefore, type WhatsNewEntry } from "@/lib/whatsNew";

/** The versions with their highlights, in the interface language. */
export function WhatsNewList({ entries }: { entries: readonly WhatsNewEntry[] }) {
  const language = useLanguage();
  return (
    <>
      {entries.map((entry) => (
        <section className="whats-new-version" key={entry.version}>
          <h2>{t("whatsNew.version", { version: entry.version })}</h2>
          <ul>
            {entry.items.map((item) => (
              <li key={item.title.en}>
                <strong>{localizedText(item.title, language)}</strong>
                <span>{localizedText(item.body, language)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * What came with the versions since the last visit, on the start page: every
 * one of them, newest first. Only the newest used to be open, the rest behind a
 * button - under a title saying "since your last visit" that read as if one
 * version was all that came. A long absence scrolls inside the card instead
 * (whats-new-body has a height limit). Below them, one button opens the versions
 * from before the last visit. Closing it remembers the current version, so it
 * does not come back until the next update.
 */
export function WhatsNewCard({ view, current, onClose }: { view: WhatsNewView; current: string; onClose: () => void }) {
  useLanguage();
  const [showEarlier, setShowEarlier] = useState(false);
  const oldestShown = view.entries[view.entries.length - 1]?.version;
  const earlier = useMemo(() => (oldestShown ? whatsNewBefore(oldestShown) : []), [oldestShown]);
  const title = view.from
    ? t("whatsNew.title", { from: view.from, to: current })
    : t("whatsNew.titleRecent");

  return (
    <aside className="whats-new" role="region" aria-label={title}>
      <header className="whats-new-header">
        <span className="whats-new-icon" aria-hidden="true">
          <Sparkles size={20} strokeWidth={2.4} />
        </span>
        <strong>{title}</strong>
        <GuideHelpLink section="whatsNew" />
        <button className="whats-new-close" type="button" aria-label={t("whatsNew.close")} title={t("whatsNew.close")} onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="whats-new-body">
        <WhatsNewList entries={view.entries} />
        {showEarlier && earlier.length > 0 ? (
          <>
            <h3 className="whats-new-earlier-heading">{t(view.from ? "whatsNew.beforeLastVisit" : "whatsNew.earlierHeading")}</h3>
            <WhatsNewList entries={earlier} />
          </>
        ) : null}
      </div>
      <footer className="whats-new-footer">
        {earlier.length > 0 && !showEarlier ? (
          <button className="whats-new-earlier" type="button" onClick={() => setShowEarlier(true)}>
            {t("whatsNew.earlier", { count: earlier.length })}
          </button>
        ) : null}
        <button className="whats-new-done" type="button" onClick={onClose}>
          {t("whatsNew.dismiss")}
        </button>
      </footer>
    </aside>
  );
}
