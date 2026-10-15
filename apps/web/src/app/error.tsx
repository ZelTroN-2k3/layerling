"use client";

import { useEffect } from "react";
import { SafeModeScreen } from "@/components/SafeModeErrorBoundary";

/**
 * The last net under the whole page: an error outside the editor (on the overview, say) shows
 * this instead of the browser's blank "Application error" page.
 */
export default function PageError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("layerling: the page stopped with an error", error);
  }, [error]);

  return (
    <SafeModeScreen
      error={error}
      // A reload would open the same design again (?editor=1&project=...): without them the page starts on the overview.
      onGoToDashboard={() => window.location.assign(window.location.pathname)}
    />
  );
}
