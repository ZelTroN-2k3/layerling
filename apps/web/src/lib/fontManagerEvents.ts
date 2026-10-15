/*
 * The font select in a text's properties offers "Your own fonts …", which opens the font window
 * the editor owns. The properties are built far from the editor's state, so they ask through here.
 */

const listeners = new Set<() => void>();

/** The value of the "Your own fonts …" entry in a font select; never a font. */
export const FONT_MANAGER_OPTION = "__font-manager";

export function requestFontManager() {
  listeners.forEach((listener) => listener());
}

export function onFontManagerRequested(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
