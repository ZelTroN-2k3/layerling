"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { ManifoldToplevel } from "manifold-3d";
import { FilePlus2, LoaderCircle, Monitor, Trash2, Type, X } from "lucide-react";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { CustomFontError, typefaceFromFontFile, type CustomTypeface } from "@/lib/customFonts";
import { deleteStoredCustomFont, onStoredCustomFontsChanged, storeCustomFont, storedCustomFonts } from "@/lib/customFontStore";
import { t } from "@/lib/i18n";
import { listSystemFonts, systemFontsNeedHttps, systemFontsSupported, SystemFontsDeniedError, type SystemFont } from "@/lib/systemFonts";
import { customFontList, onCustomFontsChanged } from "@/lib/textFonts";
import { useLanguage } from "@/lib/useLanguage";

/** Shown at once from a long list of installed fonts; the search narrows the rest. */
const SYSTEM_FONTS_SHOWN = 150;

/** Why a font could not be added, in the editor's words. */
export function customFontErrorMessage(error: unknown) {
  if (error instanceof CustomFontError) return t(`font.error.${error.message}` as Parameters<typeof t>[0]);
  return t("font.error.generic", { message: error instanceof Error ? error.message : String(error) });
}

/** Reads a font file and keeps it in this browser; the typeface it became. */
export async function addCustomFontFile(bytes: ArrayBuffer, fileName: string, loadRuntime: () => Promise<ManifoldToplevel>): Promise<CustomTypeface> {
  const typeface = await typefaceFromFontFile(bytes, fileName, await loadRuntime());
  await storeCustomFont(typeface);
  return typeface;
}

/**
 * Fonts of one's own for the text shape: a font file from disk, or - in Chrome and Edge - a font
 * installed on the computer. Lists the fonts this browser keeps and those the open design brought
 * along (only their letters), uses one on the selected text, removes one from the browser.
 */
export function FontManagerPanel({
  canApply,
  loadRuntime,
  onUse,
  onNotice,
  onClose,
}: {
  /** A text is selected: a new font goes onto it straight away. */
  canApply: boolean;
  loadRuntime: () => Promise<ManifoldToplevel>;
  onUse: (id: string) => void;
  onNotice: (message: string) => void;
  onClose: () => void;
}) {
  useLanguage();
  const [fonts, setFonts] = useState(customFontList);
  const [storedIds, setStoredIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemFonts, setSystemFonts] = useState<SystemFont[] | null>(null);
  const [query, setQuery] = useState("");
  const systemSupported = systemFontsSupported();
  const systemNeedsHttps = systemFontsNeedHttps();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  // A font file dragged in - from the Fonts folder in Explorer, which file dialogs hide.
  const dropProps = {
    onDragOver: (event: DragEvent) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      setDropping(true);
    },
    onDragLeave: () => setDropping(false),
    onDrop: (event: DragEvent) => {
      if (!event.dataTransfer.files.length) return;
      event.preventDefault();
      setDropping(false);
      const file = event.dataTransfer.files[0];
      void add(async () => ({ bytes: await file.arrayBuffer(), name: file.name }));
    },
  };

  useEffect(() => {
    const refresh = () => {
      setFonts(customFontList());
      void storedCustomFonts().then((stored) => setStoredIds(new Set(stored.map((font) => font.id)))).catch(() => setStoredIds(new Set()));
    };
    refresh();
    const stopRegistry = onCustomFontsChanged(refresh);
    const stopStore = onStoredCustomFontsChanged(refresh);
    return () => {
      stopRegistry();
      stopStore();
    };
  }, []);

  const add = async (read: () => Promise<{ bytes: ArrayBuffer; name: string }>) => {
    setBusy(true);
    setError(null);
    try {
      const { bytes, name } = await read();
      const typeface = await addCustomFontFile(bytes, name, loadRuntime);
      setFonts(customFontList());
      setStoredIds((current) => new Set([...current, typeface.id]));
      onNotice(t("font.added", { name: typeface.name }));
      if (canApply) onUse(typeface.id);
    } catch (caught) {
      setError(customFontErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const openSystemFonts = async () => {
    setError(null);
    try {
      setSystemFonts(await listSystemFonts());
    } catch (caught) {
      setError(caught instanceof SystemFontsDeniedError ? t("font.systemDenied") : customFontErrorMessage(caught));
    }
  };

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = systemFonts ?? [];
    return needle ? all.filter((font) => font.fullName.toLowerCase().includes(needle) || font.family.toLowerCase().includes(needle)) : all;
  }, [query, systemFonts]);

  const title = t("font.title");
  return (
    <MovableToolPanel className="edge-modifier-panel font-manager-panel" ariaLabel={title}>
      {(handleProps) => (<>
        <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
          <div>
            <strong>{title}</strong>
            <span>{t("font.subtitle")}</span>
          </div>
          <div className="panel-header-actions">
            <GuideHelpLink section="customFonts" />
            <button type="button" aria-label={t("font.close")} onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="edge-modifier-quick-actions font-manager-actions">
          <input
            ref={fileInputRef}
            id="font-manager-file"
            type="file"
            hidden
            accept=".ttf,.otf,.woff,font/ttf,font/otf,font/woff,application/font-sfnt"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void add(async () => ({ bytes: await file.arrayBuffer(), name: file.name }));
            }}
          />
          <button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>
            <FilePlus2 size={17} />
            {t("font.addFile")}
          </button>
          {systemSupported ? (
            <button type="button" disabled={busy} onClick={() => void openSystemFonts()}>
              <Monitor size={17} />
              {t("font.fromSystem")}
            </button>
          ) : null}
        </div>
        <div className={`font-manager-drop ${dropping ? "active" : ""}`} {...dropProps}>
          {t("font.dropHint")}
        </div>
        <small className="font-manager-note">{t("font.addFileHint")}</small>
        {!systemSupported ? <small className="font-manager-note">{t(systemNeedsHttps ? "font.systemNeedsHttps" : "font.systemUnsupported")}</small> : null}
        {busy ? <p className="font-manager-busy" role="status"><LoaderCircle size={16} className="edge-modifier-spinner" /> {t("font.reading")}</p> : null}
        {error ? <p className="font-manager-error" role="alert">{error}</p> : null}

        {systemFonts ? (
          <div className="font-manager-system">
            <input
              id="font-manager-search"
              type="search"
              value={query}
              placeholder={t("font.systemSearch")}
              aria-label={t("font.systemSearch")}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            <ul>
              {matches.slice(0, SYSTEM_FONTS_SHOWN).map((font) => (
                <li key={font.fullName}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void add(async () => ({ bytes: await (await font.blob()).arrayBuffer(), name: font.fullName }))}
                  >
                    {font.fullName}
                  </button>
                </li>
              ))}
            </ul>
            {matches.length > SYSTEM_FONTS_SHOWN ? <small className="font-manager-note">{t("font.systemMore", { count: matches.length - SYSTEM_FONTS_SHOWN })}</small> : null}
          </div>
        ) : null}

        <div className="font-manager-list">
          {fonts.length === 0 ? <p className="font-manager-note">{t("font.none")}</p> : null}
          {fonts.map((font) => (
            <div key={font.id} className="font-manager-row edge-modifier-quick-actions">
              <Type size={16} />
              <div>
                <strong>{font.name}</strong>
                <small>{storedIds.has(font.id) ? t("font.stored") : t("font.fromDesign")}</small>
              </div>
              {canApply ? (
                <button type="button" onClick={() => onUse(font.id)}>{t("font.use")}</button>
              ) : null}
              {storedIds.has(font.id) ? (
                <button
                  type="button"
                  aria-label={t("font.remove")}
                  title={t("font.remove")}
                  onClick={() => {
                    void deleteStoredCustomFont(font.id).then(() => {
                      setStoredIds((current) => new Set([...current].filter((id) => id !== font.id)));
                      onNotice(t("font.removed", { name: font.name }));
                    });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <small className="font-manager-note">{t("font.licence")}</small>
      </>)}
    </MovableToolPanel>
  );
}
