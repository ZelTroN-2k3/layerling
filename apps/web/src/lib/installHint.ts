import type { MessageKey } from "@/lib/i18n";

/** Which way to install this browser offers, when it has no button of its own to press. */
export function installHintKey(userAgent: string, maxTouchPoints: number): MessageKey {
  const iPadAsMac = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(userAgent) || iPadAsMac) return "installHint.ios";
  if (/Firefox\//.test(userAgent)) return "installHint.firefox";
  if (/Safari\//.test(userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(userAgent)) return "installHint.safariMac";
  return "installHint.chromium";
}
