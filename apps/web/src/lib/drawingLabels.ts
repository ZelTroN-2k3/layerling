import { t } from "@/lib/i18n";
import type { DrawingLabels } from "@/lib/drawingExport";

/** The words on a drawing sheet in the interface language (English where a language has none yet). */
export function drawingLabelsInLanguage(): DrawingLabels {
  return {
    front: t("drawing.front"), top: t("drawing.top"), right: t("drawing.right"),
    bores: t("drawing.bores"), id: t("drawing.id"), view: t("drawing.view"), diameter: t("drawing.diameter"),
    firstAngle: t("drawing.firstAngle"), customSheet: t("drawing.customSheet"), revision: t("drawing.revision"), drawnBy: t("drawing.drawnBy"),
    scale: t("drawing.scale"), units: t("drawing.units"), sheet: t("drawing.sheet"), notes: t("drawing.notes"),
    notesLines: [t("drawing.note1"), t("drawing.note2"), t("drawing.note3"), t("drawing.note4"), t("drawing.note5")],
  };
}
