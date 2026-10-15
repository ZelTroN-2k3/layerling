"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * A true/false setting of this browser that is kept between designs and visits - the object list
 * stays open until it is closed (#356). It starts as `false` and reads the stored value once the page
 * is on the screen: reading it while rendering would differ from the page that was built on the server.
 * Blocked storage is no error, the choice then holds until the page is closed.
 */
export function useRememberedFlag(storageKey: string, initial = false): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "true" || stored === "false") setValue(stored === "true");
    } catch {
      // Blocked storage: the flag keeps its start value.
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    // Before the stored value has been read, `value` is only the start value and must not overwrite it.
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, String(value));
    } catch {
      // Blocked storage: see above.
    }
  }, [loaded, storageKey, value]);

  return [value, setValue];
}
