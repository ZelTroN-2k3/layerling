"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, ChevronDown, ChevronRight, CloudUpload, Download, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import { cleanMyShapeName, MY_SHAPE_NAME_MAX } from "@/lib/myShapes";

const COLLAPSED_STORAGE_KEY = "layerling.myShapesCollapsed";

export type CustomShapeLocation = "browser" | "server";
export type CustomShapeEntry = { id: string; name: string; thumbnail: string; location: CustomShapeLocation };

export interface MyShapesSectionProps {
  shapes: CustomShapeEntry[];
  /** True where the shared store is on; then shapes can go to the server too. */
  serverAvailable: boolean;
  canSave: boolean;
  defaultName: string;
  onInsert: (id: string) => void;
  onSave: (name: string, location: CustomShapeLocation) => Promise<boolean>;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMoveToServer: (id: string) => void;
  onBackup: () => void;
  onLoad: () => void;
  /** Asks the server again when the menu opens: another device may have added shapes. */
  onShown: () => void;
  /** The menu closes once a tile was dragged out onto the workplane. */
  onDragDone: () => void;
}

/**
 * Custom shapes on top of the shape library (#109): a fold-away row of the
 * bodies someone kept, in this browser and - with the shared store on - on
 * the server, each tile inserted with a click or dragged onto the workplane.
 */
export function MyShapesSection({ shapes, serverAvailable, canSave, defaultName, onInsert, onSave, onRename, onDelete, onMoveToServer, onBackup, onLoad, onShown, onDragDone }: MyShapesSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [saveName, setSaveName] = useState<string | null>(null);
  const [saveLocation, setSaveLocation] = useState<CustomShapeLocation>(serverAvailable ? "server" : "browser");
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true");
    } catch {
      // Blocked storage: the section starts open.
    }
    onShown();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (saveName !== null) saveInputRef.current?.select();
  }, [saveName !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
    } catch {
      // Blocked storage: the choice holds until the menu closes.
    }
  };

  const startSave = () => {
    setCollapsed(false);
    setRenaming(null);
    setSaveLocation(serverAvailable ? "server" : "browser");
    setSaveName(defaultName);
  };

  const submitSave = async (event: FormEvent) => {
    event.preventDefault();
    if (saveName === null || saving) return;
    setSaving(true);
    try {
      if (await onSave(cleanMyShapeName(saveName, defaultName), serverAvailable ? saveLocation : "browser")) setSaveName(null);
    } finally {
      setSaving(false);
    }
  };

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    if (!renaming) return;
    const current = shapes.find((shape) => shape.id === renaming.id);
    const name = cleanMyShapeName(renaming.name, current?.name ?? defaultName);
    if (current && name !== current.name) onRename(renaming.id, name);
    setRenaming(null);
  };

  // Escape ends the edit only; the menu stays open.
  const cancelOnEscape = (event: KeyboardEvent, cancel: () => void) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    cancel();
  };

  const renderTile = (shape: CustomShapeEntry) => (
    <div className="my-shape-tile" key={shape.id}>
      {renaming?.id === shape.id ? (
        <form className="my-shape-rename" onSubmit={submitRename}>
          {shape.thumbnail ? <img src={shape.thumbnail} alt="" /> : <span className="my-shape-no-preview" />}
          <input
            aria-label={t("common.rename")}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            value={renaming.name}
            maxLength={MY_SHAPE_NAME_MAX}
            onChange={(event) => setRenaming({ id: shape.id, name: event.target.value })}
            onKeyDown={(event) => cancelOnEscape(event, () => setRenaming(null))}
          />
          <button type="submit" className="my-shape-tile-action" aria-label={t("common.save")} title={t("common.save")}>
            <Check aria-hidden="true" />
          </button>
        </form>
      ) : (
        <>
          <button
            className="shape-menu-item my-shape-item"
            type="button"
            draggable
            title={t("myShapes.insertHint")}
            onClick={() => onInsert(shape.id)}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData("application/x-layerling-my-shape", shape.id);
            }}
            onDragEnd={onDragDone}
          >
            {shape.thumbnail ? <img src={shape.thumbnail} alt="" draggable={false} /> : <span className="my-shape-no-preview" />}
            <span>{shape.name}</span>
          </button>
          <div className={`my-shape-tile-actions ${serverAvailable && shape.location === "browser" ? "three" : ""}`.trim()}>
            {confirmDelete === shape.id ? (
              <>
                <button
                  type="button"
                  className="my-shape-tile-action danger"
                  onClick={() => {
                    setConfirmDelete(null);
                    onDelete(shape.id);
                  }}
                >
                  {t("myShapes.deleteConfirm")}
                </button>
                <button type="button" className="my-shape-tile-action" aria-label={t("common.cancel")} title={t("common.cancel")} onClick={() => setConfirmDelete(null)}>
                  <X aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                {serverAvailable && shape.location === "browser" ? (
                  <button type="button" className="my-shape-tile-action" aria-label={t("myShapes.moveToServer")} title={t("myShapes.moveToServer")} onClick={() => onMoveToServer(shape.id)}>
                    <CloudUpload aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="my-shape-tile-action"
                  aria-label={t("common.rename")}
                  title={t("common.rename")}
                  onClick={() => {
                    setConfirmDelete(null);
                    setRenaming({ id: shape.id, name: shape.name });
                  }}
                >
                  <Pencil aria-hidden="true" />
                </button>
                <button type="button" className="my-shape-tile-action" aria-label={t("common.delete")} title={t("common.delete")} onClick={() => setConfirmDelete(shape.id)}>
                  <Trash2 aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );

  const browserShapes = shapes.filter((shape) => shape.location === "browser");
  const serverShapes = shapes.filter((shape) => shape.location === "server");
  const group = (title: string, list: CustomShapeEntry[]) => (
    <div className="my-shapes-group">
      {serverAvailable ? <div className="my-shapes-group-title">{title}</div> : null}
      {list.length ? <div className="shape-menu-list my-shapes-list">{list.map(renderTile)}</div> : <p className="my-shapes-empty">{t("myShapes.groupEmpty")}</p>}
    </div>
  );

  return (
    <section className="my-shapes-section" aria-label={t("myShapes.title")}>
      <div className="my-shapes-header">
        <button className="my-shapes-toggle" type="button" aria-expanded={!collapsed} onClick={toggleCollapsed}>
          {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          <span>{t("myShapes.title")}</span>
          {shapes.length > 0 ? <span className="my-shapes-count">{shapes.length}</span> : null}
        </button>
        <div className="my-shapes-actions">
          <GuideHelpLink section="myShapes" iconSize={16} />
          <button
            className="my-shapes-save-button"
            type="button"
            disabled={!canSave}
            title={canSave ? t("myShapes.saveSelectionHint") : t("myShapes.selectFirst")}
            onClick={startSave}
          >
            <Plus aria-hidden="true" />
            <span>{t("myShapes.saveSelection")}</span>
          </button>
          <button className="my-shapes-icon-button" type="button" disabled={browserShapes.length === 0} title={t("myShapes.backupHint")} aria-label={t("myShapes.backup")} onClick={onBackup}>
            <Download aria-hidden="true" />
          </button>
          <button className="my-shapes-icon-button" type="button" title={t("myShapes.loadHint")} aria-label={t("myShapes.load")} onClick={onLoad}>
            <Upload aria-hidden="true" />
          </button>
        </div>
      </div>
      {!collapsed ? (
        <div className="my-shapes-body">
          {saveName !== null ? (
            <form className="my-shapes-name-form" onSubmit={submitSave}>
              <label htmlFor="my-shape-save-name">{t("myShapes.nameLabel")}</label>
              <input
                id="my-shape-save-name"
                ref={saveInputRef}
                value={saveName}
                maxLength={MY_SHAPE_NAME_MAX}
                onChange={(event) => setSaveName(event.target.value)}
                onKeyDown={(event) => cancelOnEscape(event, () => setSaveName(null))}
              />
              {serverAvailable ? (
                <div className="my-shapes-location" role="radiogroup" aria-label={t("myShapes.locationLabel")}>
                  {(["server", "browser"] as const).map((location) => (
                    <button
                      key={location}
                      type="button"
                      role="radio"
                      aria-checked={saveLocation === location}
                      className={saveLocation === location ? "active" : undefined}
                      onClick={() => setSaveLocation(location)}
                    >
                      {t(location === "server" ? "myShapes.onServer" : "myShapes.inBrowser")}
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="submit" disabled={saving}>{t("common.save")}</button>
              <button type="button" className="secondary" onClick={() => setSaveName(null)}>{t("common.cancel")}</button>
            </form>
          ) : null}
          {shapes.length === 0 ? (
            <p className="my-shapes-empty">{t("myShapes.empty")}</p>
          ) : serverAvailable ? (
            <>
              {group(t("myShapes.onServer"), serverShapes)}
              {group(t("myShapes.inBrowser"), browserShapes)}
            </>
          ) : (
            <div className="shape-menu-list my-shapes-list">{browserShapes.map(renderTile)}</div>
          )}
        </div>
      ) : null}
    </section>
  );
}
