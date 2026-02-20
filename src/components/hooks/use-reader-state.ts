"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFloatingControls } from "@/components/hooks/use-floating-controls";
import { useLibraryLoader } from "@/components/hooks/use-library-loader";
import type { LibraryBlock, ReaderProgressRecord } from "@/services/frontend-services/library-service";
import { saveReaderProgress } from "@/services/frontend-services/library-service";

type Block = { id: string; text?: string; page?: number };
type Word = { word: string; blockId: string; offset: number; page?: number };
type LibraryLoadPayload = {
  blocks: LibraryBlock[];
  progress: ReaderProgressRecord | null;
  fileId: string;
};

const DEFAULT_SAMPLE_BLOCKS: LibraryBlock[] = [
  { id: "sample-1", text: "Welcome to Speed Reader. Sign in and pick a book from your library to start reading.", type: "paragraph", page: 1 },
  { id: "sample-2", text: "Adjust WPM, font size, and ramp up time. Your progress will save automatically as you read.", type: "paragraph", page: 1 },
  { id: "sample-3", text: "Once a book is selected, this sample text will be replaced with your content.", type: "paragraph", page: 1 },
];

const PROGRESS_SAVE_INTERVAL = 50;
const BASE_WPM = 150;

// Utility functions
const normalizePageNumber = (page: unknown): number => {
  const num = typeof page === "number" ? page : Number(page);
  return !Number.isNaN(num) ? num : 1;
};

const getWordCount = (text?: string): number => {
  const trimmed = text?.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

const computeWpmWithRamp = (currentWpm: number, rampSeconds: number, elapsedSeconds: number): number => {
  if (rampSeconds <= 0 || elapsedSeconds >= rampSeconds) return currentWpm;
  const progress = elapsedSeconds / rampSeconds;
  return BASE_WPM + (currentWpm - BASE_WPM) * progress;
};

export function useReaderState() {
  // State
  const [fontSize, setFontSize] = useState(32);
  const [wpm, setWpm] = useState(300);
  const [wordIndex, setWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rampSeconds, setRampSeconds] = useState(3);
  const [blocks, setBlocks] = useState<LibraryBlock[]>(DEFAULT_SAMPLE_BLOCKS);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [loadedProgress, setLoadedProgress] = useState<ReaderProgressRecord | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);

  // Refs
  const rampStartRef = useRef<number | null>(null);
  const progressWordCounterRef = useRef(0);
  const seekInProgressRef = useRef(false);
  const prevIsPlayingRef = useRef(isPlaying);
  const tickLockRef = useRef(false);
  const tickTimeoutRef = useRef<number | null>(null);
  const tickTokenRef = useRef(0);
  const cacheRef = useRef<Map<string, Word[]>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());
  const workerRef = useRef<Worker | null>(null);
  const currentWordsRef = useRef<Word[]>([]);
  const currentBlockIndexRef = useRef(0);
  const blocksRef = useRef<LibraryBlock[]>([]);

  // Hooks
  const { isVisible, setIsVisible, side } = useFloatingControls();
  const library = useLibraryLoader((payload) => handleLibraryLoad(payload));

  // Derived state
  const currentBlock = blocks[currentBlockIndex];
  const currentWords = cacheRef.current.get(currentBlock?.id ?? "") ?? [];
  currentBlockIndexRef.current = currentBlockIndex;
  blocksRef.current = blocks;

  const wordCounts = useMemo(() => blocks.map((b) => Math.max(getWordCount(b.text), 1)), [blocks]);
  const clampedWordIndex = Math.min(wordIndex, Math.max((wordCounts[currentBlockIndex] ?? 1) - 1, 0));

  const pageIndexMap = useMemo(() => {
    const map = new Map<number, number[]>();
    blocks.forEach((block, idx) => {
      const page = normalizePageNumber(block.page);
      if (!map.has(page)) map.set(page, []);
      map.get(page)!.push(idx);
    });
    return map;
  }, [blocks]);

  const currentPage = currentBlock?.page ?? blocks[0]?.page ?? 1;
  const currentPageIndices = pageIndexMap.get(currentPage) ?? [];
  const currentPageBlocks = useMemo(
    () => currentPageIndices.map((idx) => blocks[idx]).filter((block): block is LibraryBlock => !!block),
    [currentPageIndices, blocks],
  );
  const currentPageTotalWords = useMemo(
    () => currentPageIndices.reduce((sum, idx) => sum + (wordCounts[idx] ?? 0), 0),
    [currentPageIndices, wordCounts],
  );

  const wordsBeforeCurrent = useMemo(
    () => wordCounts.slice(0, currentBlockIndex).reduce((a, b) => a + b, 0),
    [wordCounts, currentBlockIndex],
  );

  const wordsBeforeCurrentInPage = useMemo(() => {
    let sum = 0;
    for (const idx of currentPageIndices) {
      if (idx === currentBlockIndex) break;
      sum += wordCounts[idx] ?? 0;
    }
    return sum;
  }, [currentPageIndices, currentBlockIndex, wordCounts]);

  const totalWords = useMemo(() => wordCounts.reduce((a, b) => a + b, 0), [wordCounts]);

  const progressValue = totalWords > 0 ? ((wordsBeforeCurrent + clampedWordIndex) / Math.max(totalWords - 1, 1)) * 100 : 0;
  const pageProgressValue = currentPageTotalWords > 0 ? ((wordsBeforeCurrentInPage + clampedWordIndex) / Math.max(currentPageTotalWords - 1, 1)) * 100 : 0;

  const currentBlockId = currentBlock?.id ?? "";
  const sampleFallbackWords = useMemo(() => {
    const text = currentBlock?.text?.trim();
    return text ? text.split(/\s+/) : [];
  }, [currentBlock?.id, currentBlock?.text]);
  const activeWords = useMemo<Word[]>(() => {
    if (currentWords.length > 0) return currentWords;
    if (currentFileId) return [];
    return sampleFallbackWords.map((word, offset) => ({
      word,
      blockId: currentBlockId,
      offset,
      page: currentPage,
    }));
  }, [currentWords, currentFileId, sampleFallbackWords, currentBlockId, currentPage]);
  currentWordsRef.current = activeWords;

  const displayedPastWords = useMemo(() => {
    const prev = activeWords[wordIndex - 1]?.word;
    return prev ? [prev] : [];
  }, [activeWords, wordIndex]);

  const displayedFutureWords = useMemo(() => {
    const next = activeWords[wordIndex + 1]?.word;
    return next ? [next] : [];
  }, [activeWords, wordIndex]);
  const activeWordIndex = Math.min(wordIndex, Math.max(activeWords.length - 1, 0));
  const currentWord = activeWords[activeWordIndex]?.word ?? (currentFileId ? "Loading..." : "");

  // Helper functions
  const ensureBlocks = useCallback((indices: number[]) => {
    if (!workerRef.current) return;
    const toConvert: Block[] = [];
    indices.forEach((idx) => {
      const block = blocks[idx];
      if (!block || cacheRef.current.has(block.id) || loadingRef.current.has(block.id)) return;
      loadingRef.current.add(block.id);
      toConvert.push(block);
    });
    if (toConvert.length) {
      workerRef.current.postMessage({ blocks: toConvert });
    }
  }, [blocks]);

  const ensurePagesAround = useCallback((centerPage: number, past = 0, future = 1) => {
    const indices: number[] = [];
    for (let p = centerPage - past; p <= centerPage + future; p++) {
      const pageList = pageIndexMap.get(p);
      if (pageList?.length) indices.push(...pageList);
    }
    if (indices.length) ensureBlocks(indices);
  }, [pageIndexMap, ensureBlocks]);

  const saveProgress = useCallback((blockId: string, offset: number) => {
    if (blockId && currentFileId) {
      void saveReaderProgress({ fileId: currentFileId, blockId, offset });
    }
  }, [currentFileId]);

  const handleLibraryLoad = useCallback((payload: LibraryLoadPayload) => {
    const incomingBlocks = payload.blocks.map((b) => ({
      ...b,
      page: normalizePageNumber(b.page),
    }));
    cacheRef.current = new Map();
    loadingRef.current = new Set();
    setBlocks(incomingBlocks);
    setLoadedProgress(payload.progress);
    setCurrentFileId(payload.fileId);

    if (incomingBlocks.length) {
      const progressBlockId = payload.progress?.blockId;
      const startIndex = progressBlockId
        ? Math.max(0, incomingBlocks.findIndex((b) => b.id === progressBlockId))
        : 0;
      setCurrentBlockIndex(Math.max(startIndex, 0));
      setWordIndex(payload.progress?.offset ?? 0);
      ensurePagesAround(incomingBlocks[startIndex]?.page ?? 1, 0, 1);
    }
  }, [ensurePagesAround]);

  // Effects
  useEffect(() => {
    const worker = new Worker(new URL("../../workers/block-to-words.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ blockId: string; words: Word[] }[]>) => {
      let changed = false;
      (event.data || []).forEach((res) => {
        if (res?.blockId) {
          cacheRef.current.set(res.blockId, res.words || []);
          loadingRef.current.delete(res.blockId);
          changed = true;
        }
      });
      if (changed) setCacheVersion((v) => v + 1);
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!blocks.length || !workerRef.current) return;
    ensurePagesAround(currentPage, 0, 1);
  }, [blocks, currentBlockIndex, currentPage, ensurePagesAround]);

  useEffect(() => {
    const remaining = currentWords.length - wordIndex;
    if (remaining <= 5) {
      ensurePagesAround(currentPage + 1, 0, 0);
    }
  }, [currentWords.length, wordIndex, currentPage, cacheVersion, ensurePagesAround]);

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
    if (!isPlaying || seekInProgressRef.current || !currentBlockId || !activeWords.length) {
      if (!activeWords.length && currentBlockId && currentFileId) {
        ensurePagesAround(currentPage);
      }
      return;
    }

    if (rampStartRef.current === null) {
      rampStartRef.current = performance.now();
    }

    const token = ++tickTokenRef.current;

    const computeCurrentWpm = () => {
      const elapsed = (performance.now() - (rampStartRef.current ?? performance.now())) / 1000;
      return computeWpmWithRamp(wpm, rampSeconds, elapsed);
    };

    const schedule = () => {
      if (token !== tickTokenRef.current) return;
      const intervalMs = Math.max(60, Math.round(60000 / computeCurrentWpm()));
      if (tickTimeoutRef.current !== null) window.clearTimeout(tickTimeoutRef.current);

      tickTimeoutRef.current = window.setTimeout(() => {
        if (token !== tickTokenRef.current || tickLockRef.current) return;
        tickLockRef.current = true;

        const words = currentWordsRef.current;
        const blockIndex = currentBlockIndexRef.current;
        const blocksSnap = blocksRef.current;

        setWordIndex((prev) => {
          const wordsLen = words.length;
          if (wordsLen === 0) return prev;
          const nextOffset = prev + 1;

          if (nextOffset < wordsLen) {
            progressWordCounterRef.current += 1;
            if (!seekInProgressRef.current && progressWordCounterRef.current >= PROGRESS_SAVE_INTERVAL) {
              progressWordCounterRef.current = 0;
              saveProgress(blocksSnap[blockIndex]?.id ?? "", nextOffset);
            }
            return nextOffset;
          }

          // Move to next block
          if (blockIndex < blocksSnap.length - 1) {
            const nextIdx = blockIndex + 1;
            setCurrentBlockIndex(nextIdx);
            saveProgress(blocksSnap[nextIdx]?.id ?? "", 0);
            return 0;
          }

          return prev; // End reached
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
      if (tickTimeoutRef.current !== null) window.clearTimeout(tickTimeoutRef.current);
    };
  }, [isPlaying, wpm, rampSeconds, activeWords.length, currentBlockId, currentPage, currentFileId, saveProgress, ensurePagesAround]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const seekToPercent = useCallback((percent: number) => {
    if (totalWords <= 0) return;
    const targetWord = Math.round((percent / 100) * Math.max(totalWords - 1, 0));
    let remaining = targetWord;
    let targetBlockIndex = 0;

    for (let i = 0; i < wordCounts.length; i++) {
      if (remaining < wordCounts[i]) {
        targetBlockIndex = i;
        break;
      }
      remaining -= wordCounts[i];
      targetBlockIndex = i;
    }

    const targetOffset = Math.min(remaining, wordCounts[targetBlockIndex] - 1);
    setCurrentBlockIndex(targetBlockIndex);
    setWordIndex(targetOffset);

    const indices = Array.from({ length: 9 }, (_, i) => targetBlockIndex - 3 + i).filter(
      (i) => i >= 0 && i < blocks.length,
    );
    ensureBlocks(indices);
  }, [totalWords, wordCounts, blocks.length, ensureBlocks]);

  const seekWithinPage = useCallback((percent: number) => {
    if (currentPageTotalWords <= 0 || currentPageIndices.length === 0) return;
    seekInProgressRef.current = true;

    const targetWord = Math.round((percent / 100) * Math.max(currentPageTotalWords - 1, 0));
    let remaining = targetWord;
    let targetBlockIndex = currentPageIndices[0];

    for (const idx of currentPageIndices) {
      if (remaining < (wordCounts[idx] ?? 0)) {
        targetBlockIndex = idx;
        break;
      }
      remaining -= wordCounts[idx] ?? 0;
      targetBlockIndex = idx;
    }

    const targetOffset = Math.min(remaining, (wordCounts[targetBlockIndex] ?? 1) - 1);
    setCurrentBlockIndex(targetBlockIndex);
    setWordIndex(targetOffset);
    ensurePagesAround(blocks[targetBlockIndex]?.page ?? currentPage, 0, 1);
  }, [currentPageTotalWords, currentPageIndices, wordCounts, blocks, currentPage, ensurePagesAround]);

  const endSeek = useCallback(() => {
    seekInProgressRef.current = false;
    saveProgress(currentBlockId, clampedWordIndex);
  }, [currentBlockId, clampedWordIndex, saveProgress]);

  const createSettingChangeHandler = (setter: (v: number) => void) => (value: number) => {
    setIsPlaying(false);
    setter(value);
  };

  return {
    fontSize,
    setFontSize,
    wpm,
    setWpm,
    wordIndex,
    setWordIndex,
    isPlaying,
    setIsPlaying,
    rampSeconds,
    setRampSeconds,
    currentWord,
    displayedPastWords,
    displayedFutureWords,
    wordsLength: activeWords.length,
    progressValue,
    pageProgressValue,
    currentPage,
    currentPageBlocks,
    currentBlockId,
    currentWordOffset: clampedWordIndex,
    seekToPercent,
    seekWithinPage,
    endSeek,
    onFontSizeChange: createSettingChangeHandler(setFontSize),
    onWpmChange: createSettingChangeHandler(setWpm),
    onRampSecondsChange: createSettingChangeHandler(setRampSeconds),
    floatingControls: { isVisible, setIsVisible, side },
    library,
    loadedBlocks: blocks,
    loadedProgress,
  };
}
