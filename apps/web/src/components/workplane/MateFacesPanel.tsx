"use client";

import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { Check, X } from "lucide-react";
import { EdgeModifierSlider } from "@/components/workplane/EdgeModifierPanel";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import type { MateMode } from "@/lib/mateFaces";
import type { WorkplaneWorkspaceSettings } from "@/types/layerling";

const MATE_MODES: readonly MateMode[] = ["against", "flush"];
const MAX_GAP = 100;

/**
 * "Align faces": a face of the selected body is brought into the plane of a
 * face of another body, face to face or side by side, with a gap if wanted.
 */
export function MateFacesPanel({
  targetName,
  step,
  mode,
  gap,
  workspace,
  onModeChange,
  onGapChange,
  onApply,
  onCancel,
}: {
  targetName: string;
  step: "source" | "target" | "ready";
  mode: MateMode;
  gap: number;
  workspace: WorkplaneWorkspaceSettings;
  onModeChange: (value: MateMode) => void;
  onGapChange: (value: number) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  useLanguage();
  const title = t("mate.title");
  return (
    <MovableToolPanel className="edge-modifier-panel mate-panel" ariaLabel={title}>
      {(handleProps) => (<>
      <div className="edge-modifier-header movable" title={t("panel.moveHint")} {...handleProps}>
        <div>
          <strong>{title}</strong>
          <span>{t("mate.subtitle")}</span>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section="layFlat" />
          <button type="button" aria-label={t("mate.cancel")} onClick={onCancel}><X size={20} /></button>
        </div>
      </div>

      <div className="edge-modifier-target">
        <strong>{targetName}</strong>
        <span role="status">{t(`mate.step.${step}`)}</span>
      </div>

      <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={t("mate.mode")}>
        <span>{t("mate.mode")}</span>
        <div className="shell-opening-options">
          {MATE_MODES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={mode === option}
              className={mode === option ? "active" : ""}
              onClick={() => onModeChange(option)}
            >
              {t(`mate.mode.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <EdgeModifierSlider
        label={t("mate.gap")}
        value={gap}
        min={0}
        max={MAX_GAP}
        step={0.1}
        workspace={workspace}
        length
        onChange={onGapChange}
      />

      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary" disabled={step !== "ready"} onClick={onApply}>
          <Check size={17} />
          {t("mate.apply")}
        </button>
      </div>
      </>)}
    </MovableToolPanel>
  );
}
