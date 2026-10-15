"use client";

import { Check, ChevronDown, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { APP_THEME_OPTIONS, setAppTheme, type AppThemePreference } from "@/lib/appTheme";
import { t, type MessageKey } from "@/lib/i18n";
import { useAppTheme } from "@/lib/useAppTheme";

const THEME_LABEL_KEYS: Record<AppThemePreference, MessageKey> = {
  system: "workspace.themeSystem",
  light: "workspace.themeLight",
  dark: "workspace.themeDark",
  graphite: "workspace.themeGraphite",
};

const THEME_SHORT_KEYS: Record<AppThemePreference, MessageKey> = {
  system: "theme.short.system",
  light: "theme.short.light",
  dark: "theme.short.dark",
  graphite: "theme.short.graphite",
};

export function ThemeSwitch() {
  const theme = useAppTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="theme-switch" ref={containerRef}>
      <button
        type="button"
        className={`theme-switch-button${isOpen ? " active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("common.theme")}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={`${t("common.theme")}: ${t(THEME_LABEL_KEYS[theme])}`}
      >
        <Palette size={14} className="theme-switch-icon" aria-hidden="true" />
        <span className="theme-switch-label">{t(THEME_SHORT_KEYS[theme])}</span>
        <ChevronDown size={11} className={`theme-chevron${isOpen ? " open" : ""}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="theme-dropdown-menu" role="menu" aria-label={t("common.theme")}>
          {APP_THEME_OPTIONS.map((option) => {
            const isSelected = option.value === theme;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                className={`theme-dropdown-item${isSelected ? " active" : ""}`}
                onClick={() => {
                  setAppTheme(option.value);
                  setIsOpen(false);
                }}
              >
                <span className="theme-item-label">{t(THEME_LABEL_KEYS[option.value])}</span>
                {isSelected ? <Check size={13} className="theme-check" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
