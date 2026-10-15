"use client";

import { CircleHelp } from "lucide-react";
import { guideHref, type GuideChapter, type GuideSection } from "@/lib/guideLinks";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

/**
 * A small question mark that opens the chapter of the user guide about
 * whatever it sits next to. It opens a new tab, so a design in progress stays
 * where it is; with a section it jumps to that heading, without a chapter it
 * opens the guide's overview.
 */
export function GuideHelpLink({ chapter, section, className = "", iconSize = 18, strokeWidth = 2 }: { chapter?: GuideChapter; section?: GuideSection; className?: string; iconSize?: number; strokeWidth?: number }) {
  const language = useLanguage();
  return (
    <a
      className={`guide-help-link ${className}`.trim()}
      href={guideHref(language, chapter, section)}
      target="_blank"
      rel="noreferrer"
      aria-label={t("guide.helpLink")}
      title={t("guide.helpLink")}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <CircleHelp size={iconSize} strokeWidth={strokeWidth} aria-hidden="true" />
    </a>
  );
}
