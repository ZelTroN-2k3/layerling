import type { Language } from "@/lib/i18n";

/** Where the project asks for support when the operator names no address of their own. */
export const DEFAULT_SUPPORT_URL = "https://layerling.com/support.html";

export type SupportSettings = {
  /** NEXT_PUBLIC_SPONSOR_URL: the operator's own address. */
  url?: string;
  /** NEXT_PUBLIC_SPONSOR_LABEL: the operator's own wording for the link. */
  label?: string;
  /** NEXT_PUBLIC_SUPPORT_HINT: "off" keeps the reminder card and the built-in link away. */
  hint?: string;
};

export type SupportLink = { href: string; label: string };

function switchedOff(settings: SupportSettings) {
  return settings.hint?.trim().toLowerCase() === "off";
}

/**
 * The support link of the footer. An address the operator set always wins and
 * is used as given. Without one, every installation points at the project's own
 * page - unless the operator switched that off. The page lives on another
 * origin, so the reader's language travels along in the address.
 */
export function supportLink(settings: SupportSettings, language: Language): SupportLink | null {
  const own = settings.url?.trim();
  const label = settings.label?.trim() ?? "";
  if (own) return { href: own, label };
  if (switchedOff(settings)) return null;
  return { href: `${DEFAULT_SUPPORT_URL}?lang=${language}`, label };
}

/** Whether the reminder card may appear: everywhere, unless the operator switched it off. */
export function supportCardEnabled(settings: SupportSettings): boolean {
  return !switchedOff(settings);
}
