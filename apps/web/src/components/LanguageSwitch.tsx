"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LANGUAGES, LANGUAGE_NAMES, setLanguage, t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

/**
 * The language list sits at the top right, where one looks for it on a web page - on the start
 * page as in the editor. It is a list that opens, like the theme's next to it, so any number of
 * languages fit; each is named in its own language, as a person who cannot read the interface
 * yet has to find theirs. A language that is not built in is fetched when chosen; the list
 * shows the choice at once and the interface follows when its sentences have arrived.
 */
export function LanguageSwitch() {
  const language = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shown = choice ?? language;

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="theme-switch language-switch" ref={containerRef}>
      <button
        type="button"
        className={`theme-switch-button${isOpen ? " active" : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t("common.language")}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={`${t("common.language")}: ${LANGUAGE_NAMES[language]}`}
      >
        <Globe size={14} className="theme-switch-icon" aria-hidden="true" />
        <span className="theme-switch-label">{language.toUpperCase()}</span>
        <ChevronDown size={11} className={`theme-chevron${isOpen ? " open" : ""}`} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="theme-dropdown-menu language-dropdown-menu" role="menu" aria-label={t("common.language")}>
          {LANGUAGES.map((option) => {
            const isSelected = option === shown;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                lang={option}
                className={`theme-dropdown-item${isSelected ? " active" : ""}`}
                onClick={() => {
                  setChoice(option);
                  setIsOpen(false);
                  void setLanguage(option).finally(() => setChoice(null));
                }}
              >
                <span className="theme-item-label">{LANGUAGE_NAMES[option]}</span>
                {isSelected ? <Check size={13} className="theme-check" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
