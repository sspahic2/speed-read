"use client";

import { useCallback, useState } from "react";
import { useFloatingControls } from "@/components/hooks/use-floating-controls";
import { useLibraryLoader } from "@/components/hooks/use-library-loader";
import { useReaderDocument } from "@/components/hooks/reader/use-reader-document";
import { useReaderPlayback } from "@/components/hooks/reader/use-reader-playback";
import { saveReaderProgress } from "@/services/frontend-services/library-service";

const MIN_WPM = 150;
const MAX_WPM = 350;

export function useReaderState() {
  const [fontSize, setFontSize] = useState(32);
  const [wpm, setWpm] = useState(300);
  const [rampSeconds, setRampSeconds] = useState(3);

  const { isVisible, setIsVisible, side } = useFloatingControls();
  const readerDocument = useReaderDocument();

  const saveProgress = useCallback(
    (blockId: string, offset: number) => {
      if (!blockId || !readerDocument.currentFileId) return;
      void saveReaderProgress({
        fileId: readerDocument.currentFileId,
        blockId,
        offset,
      });
    },
    [readerDocument.currentFileId],
  );

  const playback = useReaderPlayback({
    wpm,
    rampSeconds,
    activeWords: readerDocument.activeWords,
    currentBlockId: readerDocument.currentBlockId,
    currentPage: readerDocument.currentPage,
    currentFileId: readerDocument.currentFileId,
    clampedWordIndex: readerDocument.clampedWordIndex,
    blocks: readerDocument.blocks,
    currentBlockIndex: readerDocument.currentBlockIndex,
    setCurrentBlockIndex: readerDocument.setCurrentBlockIndex,
    setWordIndex: readerDocument.setWordIndex,
    ensurePagesAround: readerDocument.ensurePagesAround,
    saveProgress,
  });

  const library = useLibraryLoader(readerDocument.handleLibraryLoad);

  const seekToPercent = useCallback(
    (percent: number) => {
      if (readerDocument.totalWords <= 0) return;

      const targetWord = Math.round((percent / 100) * Math.max(readerDocument.totalWords - 1, 0));
      let remaining = targetWord;
      let targetBlockIndex = 0;

      for (let i = 0; i < readerDocument.wordCounts.length; i += 1) {
        if (remaining < readerDocument.wordCounts[i]) {
          targetBlockIndex = i;
          break;
        }
        remaining -= readerDocument.wordCounts[i];
        targetBlockIndex = i;
      }

      const targetOffset = Math.min(remaining, readerDocument.wordCounts[targetBlockIndex] - 1);
      readerDocument.setCurrentBlockIndex(targetBlockIndex);
      readerDocument.setWordIndex(targetOffset);

      const indices = Array.from(
        { length: 9 },
        (_, idx) => targetBlockIndex - 3 + idx,
      ).filter((idx) => idx >= 0 && idx < readerDocument.blocks.length);
      readerDocument.ensureBlocks(indices);
    },
    [
      readerDocument.totalWords,
      readerDocument.wordCounts,
      readerDocument.blocks.length,
      readerDocument.setCurrentBlockIndex,
      readerDocument.setWordIndex,
      readerDocument.ensureBlocks,
    ],
  );

  const seekWithinPage = useCallback(
    (percent: number) => {
      if (readerDocument.currentPageTotalWords <= 0 || readerDocument.currentPageIndices.length === 0) {
        return;
      }

      playback.beginSeek();
      const targetWord = Math.round(
        (percent / 100) * Math.max(readerDocument.currentPageTotalWords - 1, 0),
      );
      let remaining = targetWord;
      let targetBlockIndex = readerDocument.currentPageIndices[0];

      for (const idx of readerDocument.currentPageIndices) {
        if (remaining < (readerDocument.wordCounts[idx] ?? 0)) {
          targetBlockIndex = idx;
          break;
        }
        remaining -= readerDocument.wordCounts[idx] ?? 0;
        targetBlockIndex = idx;
      }

      const targetOffset = Math.min(
        remaining,
        (readerDocument.wordCounts[targetBlockIndex] ?? 1) - 1,
      );
      readerDocument.setCurrentBlockIndex(targetBlockIndex);
      readerDocument.setWordIndex(targetOffset);
      readerDocument.ensurePagesAround(
        readerDocument.blocks[targetBlockIndex]?.page ?? readerDocument.currentPage,
        0,
        1,
      );
    },
    [
      readerDocument.currentPageTotalWords,
      readerDocument.currentPageIndices,
      readerDocument.wordCounts,
      readerDocument.blocks,
      readerDocument.currentPage,
      readerDocument.setCurrentBlockIndex,
      readerDocument.setWordIndex,
      readerDocument.ensurePagesAround,
      playback.beginSeek,
    ],
  );

  const endSeek = useCallback(() => {
    playback.endSeek(readerDocument.currentBlockId, readerDocument.clampedWordIndex);
  }, [playback.endSeek, readerDocument.currentBlockId, readerDocument.clampedWordIndex]);

  const onFontSizeChange = useCallback(
    (value: number) => {
      playback.setIsPlaying(false);
      setFontSize(value);
    },
    [playback.setIsPlaying],
  );

  const onWpmChange = useCallback(
    (value: number) => {
      playback.setIsPlaying(false);
      setWpm(Math.max(MIN_WPM, Math.min(MAX_WPM, value)));
    },
    [playback.setIsPlaying],
  );

  const onRampSecondsChange = useCallback(
    (value: number) => {
      playback.setIsPlaying(false);
      setRampSeconds(value);
    },
    [playback.setIsPlaying],
  );

  return {
    fontSize,
    setFontSize,
    wpm,
    setWpm,
    wordIndex: readerDocument.wordIndex,
    setWordIndex: readerDocument.setWordIndex,
    isPlaying: playback.isPlaying,
    setIsPlaying: playback.setIsPlaying,
    rampSeconds,
    setRampSeconds,
    currentWord: readerDocument.currentWord,
    displayedPastWords: readerDocument.displayedPastWords,
    displayedFutureWords: readerDocument.displayedFutureWords,
    wordsLength: readerDocument.activeWords.length,
    progressValue: readerDocument.progressValue,
    pageProgressValue: readerDocument.pageProgressValue,
    currentPage: readerDocument.currentPage,
    currentPageBlocks: readerDocument.currentPageBlocks,
    currentBlockId: readerDocument.currentBlockId,
    currentWordOffset: readerDocument.clampedWordIndex,
    seekToPercent,
    seekWithinPage,
    endSeek,
    onFontSizeChange,
    onWpmChange,
    onRampSecondsChange,
    floatingControls: { isVisible, setIsVisible, side },
    library,
    loadedBlocks: readerDocument.blocks,
    loadedProgress: readerDocument.loadedProgress,
  };
}
