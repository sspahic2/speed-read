"use client";

import { useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

type UseReaderPlayPauseTriggerParams = {
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  isCountdownActive: boolean;
  startCountdown: () => void;
  cancelCountdown: () => void;
};

type UseReaderPlayPauseTriggerReturn = {
  handlePlayToggle: () => void;
  isReaderUiDimmed: boolean;
};

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [role="slider"], [data-radix-slider-root]';

export function useReaderPlayPauseTrigger({
  isPlaying,
  setIsPlaying,
  isCountdownActive,
  startCountdown,
  cancelCountdown,
}: UseReaderPlayPauseTriggerParams): UseReaderPlayPauseTriggerReturn {
  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (isCountdownActive) {
      cancelCountdown();
      return;
    }

    startCountdown();
  }, [isPlaying, isCountdownActive, setIsPlaying, cancelCountdown, startCountdown]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;

      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.isContentEditable || !!target.closest(INTERACTIVE_SELECTOR)) {
        return;
      }

      event.preventDefault();
      handlePlayToggle();
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [handlePlayToggle]);

  return {
    handlePlayToggle,
    isReaderUiDimmed: isPlaying || isCountdownActive,
  };
}
