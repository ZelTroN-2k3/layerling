"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

export type ShapeContextMenuItem = {
  key: string;
  label: string;
  /** As the shortcuts list writes it, "Ctrl+D"; shown with Cmd on a Mac. */
  shortcut?: string;
  danger?: boolean;
  /** Draws a line above the item. */
  separated?: boolean;
  onSelect: () => void;
};

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * The menu a right click on a body opens: the commands people otherwise look
 * for in the ribbon or know only as shortcuts. It stays inside the window and
 * closes on any press outside it, on Escape, on the wheel and on a resize.
 */
export function ShapeContextMenu({ x, y, label, items, onClose }: {
  x: number;
  y: number;
  label: string;
  items: ShapeContextMenuItem[];
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const margin = 8;
    const { width, height } = menu.getBoundingClientRect();
    setPosition({
      left: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(y, window.innerHeight - height - margin)),
    });
    menu.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, [x, y]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("pointerdown", closeOutside, true);
    window.addEventListener("keydown", closeOnKey, true);
    window.addEventListener("wheel", onClose, { passive: true });
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", closeOutside, true);
      window.removeEventListener("keydown", closeOnKey, true);
      window.removeEventListener("wheel", onClose);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  const moveFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  const mac = isMac();
  return (
    <div
      ref={menuRef}
      className="shape-context-menu"
      role="menu"
      aria-label={label}
      style={{ left: position.left, top: position.top }}
      onKeyDown={moveFocus}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          className={`${item.danger ? "danger" : ""}${item.separated ? " separated" : ""}`.trim() || undefined}
          onClick={() => {
            onClose();
            item.onSelect();
          }}
        >
          <span>{item.label}</span>
          {item.shortcut ? <kbd>{mac ? item.shortcut.replace(/Ctrl\+/g, "⌘").replace(/Shift\+/g, "⇧") : item.shortcut}</kbd> : null}
        </button>
      ))}
    </div>
  );
}
