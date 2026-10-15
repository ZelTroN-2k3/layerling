"use client";

import { FolderOpen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { DEFAULT_ICON_TAG_WIDTH, MAX_ICON_TAG_WIDTH, MIN_ICON_TAG_WIDTH } from "@/lib/iconTag";
import { t } from "@/lib/i18n";
import { localizedError } from "@/lib/userErrors";
import { parseMeasurementInput } from "@/lib/measurementUnits";
import { useLanguage } from "@/lib/useLanguage";

/**
 * The icon tag window: the shape library's Icon tag opens it. Browse for an SVG file, see it,
 * set how wide the icon is, and OK makes the tag in the name tag's layers on the plate.
 */
export function IconTagPanel({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (file: File, width: number) => Promise<void>;
}) {
  useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [width, setWidth] = useState(String(DEFAULT_ICON_TAG_WIDTH));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The picture is the file itself, shown by the browser; its address goes when the file does.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const parsed = parseMeasurementInput(width);
  const widthOk = Number.isFinite(parsed) && parsed >= MIN_ICON_TAG_WIDTH && parsed <= MAX_ICON_TAG_WIDTH;
  const create = async () => {
    if (!file || !widthOk || busy) return;
    setBusy(true);
    setError("");
    try {
      await onCreate(file, parsed);
    } catch (reason) {
      setError(reason instanceof Error ? localizedError(reason.message) : String(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <MovableToolPanel className="top-action-panel import-action-panel icon-tag-panel" ariaLabel={t("iconTag.title")}>
      {(handleProps) => (<>
      <header className="movable" title={t("panel.moveHint")} {...handleProps}>
        <div className="top-action-heading">
          <strong>{t("iconTag.title")}</strong>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink chapter="text" section="iconTag" />
          <button type="button" aria-label={t("panel.close", { title: t("iconTag.title") })} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </header>
      <div className="top-action-body">
        <p>{t("iconTag.hint")}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".svg,image/svg+xml"
          hidden
          data-testid="icon-tag-file"
          onChange={(event) => {
            const chosen = event.currentTarget.files?.[0] ?? null;
            event.currentTarget.value = "";
            if (!chosen) return;
            setFile(chosen);
            setError("");
          }}
        />
        <button className="open-lyl-project-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          <span className="open-lyl-project-icon"><FolderOpen size={18} /></span>
          <span>
            <strong>{t("iconTag.browse")}</strong>
            <small>{file ? file.name : t("iconTag.noFile")}</small>
          </span>
        </button>
        <div className="icon-tag-preview" aria-label={t("iconTag.preview")}>
          {preview ? <img src={preview} alt={file?.name ?? ""} /> : <span className="icon-tag-preview-empty" aria-hidden="true">SVG</span>}
        </div>
        <label className="icon-tag-width">
          <span>{t("iconTag.width")}</span>
          <input
            type="text"
            inputMode="decimal"
            value={width}
            disabled={busy}
            aria-invalid={!widthOk}
            onChange={(event) => setWidth(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void create();
            }}
          />
          <small>{t("iconTag.widthHint", { min: MIN_ICON_TAG_WIDTH, max: MAX_ICON_TAG_WIDTH })}</small>
        </label>
        {error ? <p className="icon-tag-error" role="alert">{error}</p> : null}
        <button className="icon-tag-ok" type="button" disabled={!file || !widthOk || busy} onClick={() => void create()}>
          {busy ? t("iconTag.building") : t("iconTag.ok")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
