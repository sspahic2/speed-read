"use client";

import { useEffect, useRef } from "react";

type ReaderSettings = {
  fontSize?: number;
  wpm?: number;
  rampSeconds?: number;
};

type UsePreferencesParams = {
  isAuthenticated: boolean;
  fontSize: number;
  wpm: number;
  rampSeconds: number;
  onLoaded: (settings: ReaderSettings) => void;
};

const DEBOUNCE_MS = 2000;

export function usePreferences({
  isAuthenticated,
  fontSize,
  wpm,
  rampSeconds,
  onLoaded,
}: UsePreferencesParams) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const readyToSaveRef = useRef(false);
  const prevValuesRef = useRef({ fontSize, wpm, rampSeconds });
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  // Load preferences once authenticated
  useEffect(() => {
    if (!isAuthenticated || loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/preferences");
        if (!res.ok) return;
        const data = (await res.json()) as { settings: ReaderSettings };
        if (data.settings && typeof data.settings === "object") {
          const s = data.settings;
          if (s.fontSize != null || s.wpm != null || s.rampSeconds != null) {
            onLoadedRef.current(s);
            // Update prev so we don't immediately re-save the loaded values
            prevValuesRef.current = {
              fontSize: s.fontSize ?? prevValuesRef.current.fontSize,
              wpm: s.wpm ?? prevValuesRef.current.wpm,
              rampSeconds: s.rampSeconds ?? prevValuesRef.current.rampSeconds,
            };
          }
        }
      } catch {
        // Silently fail
      } finally {
        // Allow saving only after load attempt completes
        readyToSaveRef.current = true;
      }
    })();
  }, [isAuthenticated]);

  // Debounced save when values change
  useEffect(() => {
    if (!isAuthenticated || !readyToSaveRef.current) return;

    const prev = prevValuesRef.current;
    if (prev.fontSize === fontSize && prev.wpm === wpm && prev.rampSeconds === rampSeconds) return;
    prevValuesRef.current = { fontSize, wpm, rampSeconds };

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { fontSize, wpm, rampSeconds } }),
      });
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [isAuthenticated, fontSize, wpm, rampSeconds]);
}
