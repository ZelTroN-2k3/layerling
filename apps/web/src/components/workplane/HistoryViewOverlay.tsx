"use client";

import { ChevronLeft, ChevronRight, Download, FilePlus2, LoaderCircle, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";

/**
 * Die Leiste sitzt unten in der Mitte und laesst sich an der Kopfzeile ueber die
 * Arbeitsflaeche ziehen, wenn sie etwas verdeckt; ein Doppelklick darauf holt
 * sie zurueck.
 */
const HISTORY_BAR: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto", margin: 0 },
  area: (panel) => panel.ownerDocument.querySelector<HTMLElement>(".workplane-stage"),
};

/**
 * Wann ein Stand entstanden ist, in der Sprache der Oberflaeche. Staende aus
 * Projekten von vor dieser Angabe haben keine Zeit; dann steht hier nichts.
 */
export function formatHistoryStateTime(at: number | undefined, language: string) {
  if (typeof at !== "number" || !Number.isFinite(at)) return null;
  try {
    return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(at));
  } catch {
    return new Date(at).toLocaleString();
  }
}

/**
 * Der Zusatz, den ein Projekt oder eine Datei aus einem frueheren Stand im
 * Namen traegt: die Zeit des Standes, lesbar und ohne Zeichen, die ein
 * Dateiname nicht mag. Ohne Zeit gibt es keinen Zusatz - dann heisst die
 * Kopie wie jede andere Kopie.
 */
export function historyStateNameSuffix(at: number | undefined) {
  if (typeof at !== "number" || !Number.isFinite(at)) return null;
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}.${pad(date.getMinutes())}`;
}

/**
 * Die Leiste des Verlaufsblicks. Sie liegt unten ueber der Arbeitsflaeche, die
 * derweil den gewaehlten Stand zeigt; der Schieber geht durch alle Staende, die
 * Rueckgaengig und Wiederherstellen erreichen. Nichts hier aendert das Projekt:
 * Was man mitnehmen will, wird ein neues Projekt oder ein Export.
 */
export function HistoryViewOverlay({
  index,
  count,
  liveIndex,
  recordedAt,
  objectCount,
  creating,
  canCreateProject,
  onIndexChange,
  onExport,
  onCreateProject,
  onDeleteHistory,
  onClose,
}: {
  /** Der gezeigte Stand, 0 ist der aelteste. */
  index: number;
  count: number;
  /** Der Stand, an dem das Projekt wirklich steht. */
  liveIndex: number;
  recordedAt?: number;
  objectCount: number;
  creating: boolean;
  canCreateProject: boolean;
  onIndexChange: (index: number) => void;
  onExport: () => void;
  onCreateProject: () => void;
  /** Wirft den ganzen Verlauf weg; der Entwurf behaelt seinen jetzigen Stand (#246). */
  onDeleteHistory: () => void;
  onClose: () => void;
}) {
  const language = useLanguage();
  const movable = useMovablePanel<HTMLElement>("layerling.editor.historyViewPosition", HISTORY_BAR);
  const sliderRef = useRef<HTMLInputElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => {
    sliderRef.current?.focus({ preventScroll: true });
  }, []);
  const max = Math.max(0, count - 1);
  const position = max > 0 ? `${(index / max) * 100}%` : "100%";
  const time = formatHistoryStateTime(recordedAt, language);
  const distance = index - liveIndex;
  const relation = distance === 0
    ? t("historyView.atCurrent")
    : distance < 0
      ? (distance === -1 ? t("historyView.stepsBackOne") : t("historyView.stepsBackMany", { count: -distance }))
      : (distance === 1 ? t("historyView.stepsAheadOne") : t("historyView.stepsAheadMany", { count: distance }));

  return (
    <aside
      ref={movable.panelRef}
      className={`history-view-bar ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      role="region"
      aria-label={t("historyView.title")}
      data-testid="history-view"
      onKeyDown={(event) => {
        // Der Schieber hat den Fokus, und die Tastatur des Editors ueberhoert
        // Felder - Escape muss also hier ankommen, sonst schliesst nur die Maus.
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="history-view-head movable" title={t("panel.moveHint")} {...movable.handleProps}>
        <div className="history-view-heading">
          <strong>{t("historyView.title")}</strong>
          <span>{t("historyView.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="historyView" />
          <button type="button" aria-label={t("historyView.close")} title={t("historyView.close")} onClick={onClose}><X size={20} /></button>
        </div>
      </div>

      <div className="history-view-slider">
        <button type="button" aria-label={t("historyView.earlier")} title={t("historyView.earlier")} disabled={index <= 0} onClick={() => onIndexChange(index - 1)}>
          <ChevronLeft size={18} />
        </button>
        <div className="range-control" style={{ "--slider-pos": position } as CSSProperties}>
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={max}
            step={1}
            value={index}
            aria-label={t("historyView.slider")}
            aria-valuetext={t("historyView.position", { index: index + 1, count })}
            onChange={(event) => onIndexChange(Number(event.currentTarget.value))}
          />
        </div>
        <button type="button" aria-label={t("historyView.later")} title={t("historyView.later")} disabled={index >= max} onClick={() => onIndexChange(index + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="history-view-state">
        <strong>{t("historyView.position", { index: index + 1, count })}</strong>
        <span className="history-view-facts">
          {time ? <span>{time}</span> : null}
          <span>{objectCount === 1 ? t("historyView.objectsOne") : t("historyView.objectsMany", { count: objectCount })}</span>
          <span className={distance === 0 ? "current" : ""}>{relation}</span>
        </span>
      </div>

      {confirmingDelete ? (
        <div className="history-view-confirm" role="alertdialog" aria-labelledby="history-delete-title" aria-describedby="history-delete-body">
          <strong id="history-delete-title">{t("historyView.deleteTitle")}</strong>
          <p id="history-delete-body">{t("historyView.deleteBody")}</p>
          <div className="history-view-confirm-actions">
            {/* Focused, so a stray Enter keeps the history. */}
            <button type="button" className="secondary" autoFocus onClick={() => setConfirmingDelete(false)}>{t("common.cancel")}</button>
            <button type="button" className="danger" onClick={onDeleteHistory}>
              <Trash2 size={16} aria-hidden="true" />
              {t("historyView.deleteConfirm")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="history-view-actions">
        {/* Alone at the left, away from the buttons that take something along. */}
        <button type="button" className="delete-history" disabled={confirmingDelete || count <= 1} title={count <= 1 ? t("historyView.deleteNothing") : t("historyView.deleteHint")} onClick={() => setConfirmingDelete(true)}>
          <Trash2 size={16} aria-hidden="true" />
          {t("historyView.delete")}
        </button>
        <button type="button" className="secondary" onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          {t("historyView.export")}
        </button>
        <button type="button" className="primary" disabled={creating || !canCreateProject} title={canCreateProject ? undefined : t("status.historyProjectUnavailable")} onClick={onCreateProject}>
          {creating ? <LoaderCircle size={16} className="history-view-spinner" aria-hidden="true" /> : <FilePlus2 size={16} aria-hidden="true" />}
          {t("historyView.createProject")}
        </button>
      </div>
    </aside>
  );
}
