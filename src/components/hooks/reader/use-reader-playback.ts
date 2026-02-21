"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LibraryBlock } from "@/services/frontend-services/library-service";
import type { Word } from "@/types/reader";
import {
  computeWpmWithRamp,
  PROGRESS_SAVE_INTERVAL,
} from "@/lib/reader-utils";

type UseReaderPlaybackParams = {
  wpm: number;
  rampSeconds: number;
  activeWords: Word[];
  currentBlockId: string;
  currentPage: number;
  currentFileId: string | null;
  clampedWordIndex: number;
  blocks: LibraryBlock[];
  currentBlockIndex: number;
  setCurrentBlockIndex: Dispatch<SetStateAction<number>>;
  setWordIndex: Dispatch<SetStateAction<number>>;
  ensurePagesAround: (centerPage: number, past?: number, future?: number) => void;
  saveProgress: (blockId: string, offset: number) => void;
};

type UseReaderPlaybackReturn = {
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  beginSeek: () => void;
  endSeek: (blockId: string, offset: number) => void;
};

export function useReaderPlayback({
  wpm,
  rampSeconds,
  activeWords,
  currentBlockId,
  currentPage,
  currentFileId,
  clampedWordIndex,
  blocks,
  currentBlockIndex,
  setCurrentBlockIndex,
  setWordIndex,
  ensurePagesAround,
  saveProgress,
}: UseReaderPlaybackParams): UseReaderPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);

  const rampStartRef = useRef<number | null>(null);
  const progressWordCounterRef = useRef(0);
  const seekInProgressRef = useRef(false);
  const prevIsPlayingRef = useRef(isPlaying);
  const tickLockRef = useRef(false);
  const tickTimeoutRef = useRef<number | null>(null);
  const tickTokenRef = useRef(0);
  const currentWordsRef = useRef<Word[]>(activeWords);
  const currentBlockIndexRef = useRef(currentBlockIndex);
  const blocksRef = useRef<LibraryBlock[]>(blocks);

  currentWordsRef.current = activeWords;
  currentBlockIndexRef.current = currentBlockIndex;
  blocksRef.current = blocks;

  useEffect(() => {
    if (isPlaying && rampStartRef.current === null) {
      rampStartRef.current = performance.now();
    }

    if (prevIsPlayingRef.current && !isPlaying && !seekInProgressRef.current) {
      rampStartRef.current = null;
      saveProgress(currentBlockId, clampedWordIndex);
    }

    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, currentBlockId, clampedWordIndex, saveProgress]);

  useEffect(() => {
    if (!isPlaying || seekInProgressRef.current || !currentBlockId || activeWords.length === 0) {
      if (activeWords.length === 0 && currentBlockId && currentFileId) {
        ensurePagesAround(currentPage);
      }
      return;
    }

    if (rampStartRef.current === null) {
      rampStartRef.current = performance.now();
    }

    const token = ++tickTokenRef.current;

    const computeCurrentWpm = () => {
      const elapsedSeconds = (performance.now() - (rampStartRef.current ?? performance.now())) / 1000;
      return computeWpmWithRamp(wpm, rampSeconds, elapsedSeconds);
    };

    const schedule = () => {
      if (token !== tickTokenRef.current) return;

      const intervalMs = Math.max(60, Math.round(60000 / computeCurrentWpm()));
      if (tickTimeoutRef.current !== null) {
        window.clearTimeout(tickTimeoutRef.current);
      }

      tickTimeoutRef.current = window.setTimeout(() => {
        if (token !== tickTokenRef.current || tickLockRef.current) return;
        tickLockRef.current = true;

        const words = currentWordsRef.current;
        const blockIndex = currentBlockIndexRef.current;
        const blocksSnapshot = blocksRef.current;

        setWordIndex((prev) => {
          const wordsLength = words.length;
          if (wordsLength === 0) return prev;

          const nextOffset = prev + 1;
          if (nextOffset < wordsLength) {
            progressWordCounterRef.current += 1;
            if (!seekInProgressRef.current && progressWordCounterRef.current >= PROGRESS_SAVE_INTERVAL) {
              progressWordCounterRef.current = 0;
              saveProgress(blocksSnapshot[blockIndex]?.id ?? "", nextOffset);
            }
            return nextOffset;
          }

          if (blockIndex < blocksSnapshot.length - 1) {
            const nextIndex = blockIndex + 1;
            setCurrentBlockIndex(nextIndex);
            saveProgress(blocksSnapshot[nextIndex]?.id ?? "", 0);
            return 0;
          }

          return prev;
        });

        tickLockRef.current = false;
        if (token === tickTokenRef.current && isPlaying && !seekInProgressRef.current) {
          schedule();
        }
      }, intervalMs);
    };

    schedule();

    return () => {
      tickTokenRef.current += 1;
      if (tickTimeoutRef.current !== null) {
        window.clearTimeout(tickTimeoutRef.current);
      }
    };
  }, [
    isPlaying,
    wpm,
    rampSeconds,
    activeWords.length,
    currentBlockId,
    currentPage,
    currentFileId,
    ensurePagesAround,
    saveProgress,
    setCurrentBlockIndex,
    setWordIndex,
  ]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      setIsPlaying((playing) => !playing);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const beginSeek = useCallback(() => {
    seekInProgressRef.current = true;
  }, []);

  const endSeek = useCallback(
    (blockId: string, offset: number) => {
      seekInProgressRef.current = false;
      saveProgress(blockId, offset);
    },
    [saveProgress],
  );

  return {
    isPlaying,
    setIsPlaying,
    beginSeek,
    endSeek,
  };
}
