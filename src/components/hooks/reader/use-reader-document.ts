"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LibraryBlock, ReaderProgressRecord } from "@/services/frontend-services/library-service";
import type { Block, LibraryLoadPayload, Word } from "@/types/reader";
import {
  DEFAULT_SAMPLE_BLOCKS,
  getWordCount,
  normalizePageNumber,
  PREFETCH_THRESHOLD_WORDS,
} from "@/lib/reader-utils";

const buildPageIndexMap = (items: LibraryBlock[]) => {
  const map = new Map<number, number[]>();
  items.forEach((block, idx) => {
    const page = normalizePageNumber(block.page);
    if (!map.has(page)) map.set(page, []);
    map.get(page)!.push(idx);
  });
  return map;
};

const collectPageIndices = (
  pageMap: Map<number, number[]>,
  centerPage: number,
  past = 0,
  future = 1,
) => {
  const indices: number[] = [];
  for (let page = centerPage - past; page <= centerPage + future; page += 1) {
    const pageList = pageMap.get(page);
    if (pageList?.length) indices.push(...pageList);
  }
  return indices;
};

type UseReaderDocumentReturn = {
  blocks: LibraryBlock[];
  currentBlockIndex: number;
  setCurrentBlockIndex: Dispatch<SetStateAction<number>>;
  wordIndex: number;
  setWordIndex: Dispatch<SetStateAction<number>>;
  currentFileId: string | null;
  loadedProgress: ReaderProgressRecord | null;
  currentPage: number;
  currentPageIndices: number[];
  currentPageBlocks: LibraryBlock[];
  currentPageTotalWords: number;
  wordCounts: number[];
  totalWords: number;
  progressValue: number;
  pageProgressValue: number;
  clampedWordIndex: number;
  currentBlockId: string;
  activeWords: Word[];
  currentWord: string;
  displayedPastWords: string[];
  displayedFutureWords: string[];
  ensureBlocks: (indices: number[]) => void;
  ensurePagesAround: (centerPage: number, past?: number, future?: number) => void;
  handleLibraryLoad: (payload: LibraryLoadPayload) => void;
};

export function useReaderDocument(): UseReaderDocumentReturn {
  const [blocks, setBlocks] = useState<LibraryBlock[]>(DEFAULT_SAMPLE_BLOCKS);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [loadedProgress, setLoadedProgress] = useState<ReaderProgressRecord | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);

  const cacheRef = useRef<Map<string, Word[]>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());
  const workerRef = useRef<Worker | null>(null);
  const blocksRef = useRef<LibraryBlock[]>(blocks);

  blocksRef.current = blocks;

  const queueBlocksForConversion = useCallback((sourceBlocks: LibraryBlock[], indices: number[]) => {
    if (!workerRef.current) return;

    const toConvert: Block[] = [];
    indices.forEach((idx) => {
      const block = sourceBlocks[idx];
      if (!block || cacheRef.current.has(block.id) || loadingRef.current.has(block.id)) return;
      loadingRef.current.add(block.id);
      toConvert.push(block);
    });

    if (toConvert.length > 0) {
      workerRef.current.postMessage({ blocks: toConvert });
    }
  }, []);

  const ensureBlocks = useCallback(
    (indices: number[]) => {
      queueBlocksForConversion(blocksRef.current, indices);
    },
    [queueBlocksForConversion],
  );

  const currentBlock = blocks[currentBlockIndex];
  const currentWords = cacheRef.current.get(currentBlock?.id ?? "") ?? [];

  const wordCounts = useMemo(() => blocks.map((b) => Math.max(getWordCount(b.text), 1)), [blocks]);
  const clampedWordIndex = Math.min(wordIndex, Math.max((wordCounts[currentBlockIndex] ?? 1) - 1, 0));

  const pageIndexMap = useMemo(() => buildPageIndexMap(blocks), [blocks]);
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
    () => wordCounts.slice(0, currentBlockIndex).reduce((sum, count) => sum + count, 0),
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

  const totalWords = useMemo(() => wordCounts.reduce((sum, count) => sum + count, 0), [wordCounts]);
  const progressValue =
    totalWords > 0 ? ((wordsBeforeCurrent + clampedWordIndex) / Math.max(totalWords - 1, 1)) * 100 : 0;
  const pageProgressValue =
    currentPageTotalWords > 0
      ? ((wordsBeforeCurrentInPage + clampedWordIndex) / Math.max(currentPageTotalWords - 1, 1)) * 100
      : 0;

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

  const ensurePagesAround = useCallback(
    (centerPage: number, past = 0, future = 1) => {
      const indices = collectPageIndices(pageIndexMap, centerPage, past, future);
      if (indices.length > 0) {
        ensureBlocks(indices);
      }
    },
    [pageIndexMap, ensureBlocks],
  );

  const handleLibraryLoad = useCallback(
    (payload: LibraryLoadPayload) => {
      const incomingBlocks = payload.blocks.map((block) => ({
        ...block,
        page: normalizePageNumber(block.page),
      }));

      cacheRef.current = new Map();
      loadingRef.current = new Set();
      setBlocks(incomingBlocks);
      setLoadedProgress(payload.progress);
      setCurrentFileId(payload.fileId);

      if (incomingBlocks.length === 0) {
        setCurrentBlockIndex(0);
        setWordIndex(0);
        return;
      }

      const progressBlockId = payload.progress?.blockId;
      const startIndex = progressBlockId
        ? Math.max(0, incomingBlocks.findIndex((block) => block.id === progressBlockId))
        : 0;
      setCurrentBlockIndex(startIndex);
      setWordIndex(payload.progress?.offset ?? 0);

      const incomingPageMap = buildPageIndexMap(incomingBlocks);
      const preloadIndices = collectPageIndices(
        incomingPageMap,
        normalizePageNumber(incomingBlocks[startIndex]?.page),
        0,
        1,
      );
      if (preloadIndices.length > 0) {
        queueBlocksForConversion(incomingBlocks, preloadIndices);
      }
    },
    [queueBlocksForConversion],
  );

  useEffect(() => {
    const worker = new Worker(new URL("../../../workers/block-to-words.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<{ blockId: string; words: Word[] }[]>) => {
      let changed = false;
      (event.data ?? []).forEach((result) => {
        if (!result?.blockId) return;
        cacheRef.current.set(result.blockId, result.words ?? []);
        loadingRef.current.delete(result.blockId);
        changed = true;
      });
      if (changed) setCacheVersion((version) => version + 1);
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
  }, [blocks, currentPage, ensurePagesAround]);

  useEffect(() => {
    const remaining = currentWords.length - wordIndex;
    if (remaining <= PREFETCH_THRESHOLD_WORDS) {
      ensurePagesAround(currentPage + 1, 0, 0);
    }
  }, [currentWords.length, wordIndex, currentPage, cacheVersion, ensurePagesAround]);

  return {
    blocks,
    currentBlockIndex,
    setCurrentBlockIndex,
    wordIndex,
    setWordIndex,
    currentFileId,
    loadedProgress,
    currentPage,
    currentPageIndices,
    currentPageBlocks,
    currentPageTotalWords,
    wordCounts,
    totalWords,
    progressValue,
    pageProgressValue,
    clampedWordIndex,
    currentBlockId,
    activeWords,
    currentWord,
    displayedPastWords,
    displayedFutureWords,
    ensureBlocks,
    ensurePagesAround,
    handleLibraryLoad,
  };
}
