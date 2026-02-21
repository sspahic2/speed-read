import type { LibraryBlock } from "@/services/frontend-services/library-service";

export const DEFAULT_SAMPLE_BLOCKS: LibraryBlock[] = [
  {
    id: "sample-1",
    text: "Welcome to Speed Reader. Sign in and pick a book from your library to start reading.",
    type: "paragraph",
    page: 1,
  },
  {
    id: "sample-2",
    text: "Adjust WPM, font size, and ramp up time. Your progress will save automatically as you read.",
    type: "paragraph",
    page: 1,
  },
  {
    id: "sample-3",
    text: "Once a book is selected, this sample text will be replaced with your content.",
    type: "paragraph",
    page: 1,
  },
];

export const PROGRESS_SAVE_INTERVAL = 50;
const BASE_WPM = 150;
export const PREFETCH_THRESHOLD_WORDS = 5;
const CORE_WORD_CHARS_REGEX = /[\p{L}\p{N}]/gu;
const CORE_WORD_CHAR_REGEX = /[\p{L}\p{N}]/u;
const LONG_WORD_LENGTH_THRESHOLD = 7;
const MOBILE_LONG_WORD_SCALE = 0.8;
const MOBILE_DOWNSCALE_MIN_FONT_SIZE = 40;

export type WordPivotParts = {
  prefix: string;
  pivot: string;
  suffix: string;
};

export const normalizePageNumber = (page: unknown): number => {
  const num = typeof page === "number" ? page : Number(page);
  return Number.isNaN(num) ? 1 : num;
};

export const getWordCount = (text?: string): number => {
  const trimmed = text?.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

export const computeWpmWithRamp = (
  currentWpm: number,
  rampSeconds: number,
  elapsedSeconds: number,
): number => {
  if (rampSeconds <= 0 || elapsedSeconds >= rampSeconds) return currentWpm;
  const progress = elapsedSeconds / rampSeconds;
  return BASE_WPM + (currentWpm - BASE_WPM) * progress;
};

export const getDisplayWordLength = (word: string): number => {
  const token = word.trim();
  if (!token) return 0;

  const coreChars = token.match(CORE_WORD_CHARS_REGEX);
  if (coreChars?.length) return coreChars.length;

  return Array.from(token).length;
};

export const computeMobileWordFontSize = (baseFontSize: number, word: string): number => {
  if (baseFontSize <= MOBILE_DOWNSCALE_MIN_FONT_SIZE) return baseFontSize;

  const wordLength = getDisplayWordLength(word);
  if (wordLength < LONG_WORD_LENGTH_THRESHOLD) return baseFontSize;
  return Math.round(baseFontSize * MOBILE_LONG_WORD_SCALE * 10) / 10;
};

export const splitWordAtPivot = (word: string): WordPivotParts => {
  const chars = Array.from(word);
  if (chars.length === 0) {
    return { prefix: "", pivot: "", suffix: "" };
  }

  const letterIndices: number[] = [];
  chars.forEach((char, index) => {
    if (CORE_WORD_CHAR_REGEX.test(char)) {
      letterIndices.push(index);
    }
  });

  const pivotIndex =
    letterIndices.length > 0
      ? letterIndices[Math.floor((letterIndices.length - 1) / 2)]
      : Math.floor((chars.length - 1) / 2);

  return {
    prefix: chars.slice(0, pivotIndex).join(""),
    pivot: chars[pivotIndex] ?? "",
    suffix: chars.slice(pivotIndex + 1).join(""),
  };
};
