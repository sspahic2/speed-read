"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

type UseReaderPlayPauseTriggerParams = {
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  isCountdownActive: boolean;
  startCountdown: () => void;
  cancelCountdown: () => void;
  onStepForward?: () => void;
  onStepBackward?: () => void;
  skipCountdown?: boolean;
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
  onStepForward,
  onStepBackward,
  skipCountdown,
}: UseReaderPlayPauseTriggerParams): UseReaderPlayPauseTriggerReturn {
  const skipCountdownRef = useRef(skipCountdown);
  skipCountdownRef.current = skipCountdown;

  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (isCountdownActive) {
      cancelCountdown();
      return;
    }

    if (skipCountdownRef.current) {
      setIsPlaying(true);
    } else {
      startCountdown();
    }
  }, [isPlaying, isCountdownActive, setIsPlaying, cancelCountdown, startCountdown]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.isContentEditable || !!target.closest(INTERACTIVE_SELECTOR)) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        handlePlayToggle();
        return;
      }

      if (event.code === "ArrowLeft" && onStepBackward && !isPlaying) {
        event.preventDefault();
        if (isCountdownActive) cancelCountdown();
        onStepBackward();
        return;
      }

      if (event.code === "ArrowRight" && onStepForward && !isPlaying) {
        event.preventDefault();
        if (isCountdownActive) cancelCountdown();
        onStepForward();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [handlePlayToggle, onStepForward, onStepBackward, isPlaying, isCountdownActive, cancelCountdown]);

  return {
    handlePlayToggle,
    isReaderUiDimmed: isPlaying || isCountdownActive,
  };
}
