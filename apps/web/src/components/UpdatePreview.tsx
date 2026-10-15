"use client";

import { useEffect, useState } from "react";
import { WhatsNewList } from "@/components/WhatsNewCard";
import type { AppUpdateInfo } from "@/lib/appUpdate";
import { t } from "@/lib/i18n";
import { fetchUpdatePreview } from "@/lib/updatePreview";
import { useLanguage } from "@/lib/useLanguage";
import type { WhatsNewEntry } from "@/lib/whatsNew";

type PreviewState = { status: "idle" } | { status: "loading" } | { status: "ready"; entries: WhatsNewEntry[] } | { status: "unavailable" };

/**
 * Under the "update available" notice: a button that shows what the update
 * brings before anyone installs it. The list is only fetched when the button is
 * pressed - nothing extra is asked of GitHub for people who just want to update.
 */
export function UpdatePreview({ update, currentVersion }: { update: AppUpdateInfo; currentVersion: string }) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PreviewState>({ status: "idle" });

  // A newer release than the one previewed: ask again.
  useEffect(() => {
    setOpen(false);
    setState({ status: "idle" });
  }, [update.latestVersion]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    // A list already there is kept; one that could not be fetched is asked for again.
    if (state.status === "ready" || state.status === "loading") return;
    setState({ status: "loading" });
    void fetchUpdatePreview(update.latestVersion, currentVersion).then((entries) => {
      setState(entries && entries.length > 0 ? { status: "ready", entries } : { status: "unavailable" });
    });
  };

  return (
    <div className="dashboard-update-preview">
      <button className="dashboard-update-preview-toggle" type="button" aria-expanded={open} onClick={toggle}>
        {open ? t("update.previewHide") : t("update.previewShow")}
      </button>
      {open ? (
        <div className="dashboard-update-preview-body" role="region" aria-label={t("update.previewShow")} aria-live="polite">
          {state.status === "loading" ? <p>{t("update.previewLoading")}</p> : null}
          {state.status === "unavailable" ? <p>{t("update.previewNone")}</p> : null}
          {state.status === "ready" ? <WhatsNewList entries={state.entries} /> : null}
        </div>
      ) : null}
    </div>
  );
}
