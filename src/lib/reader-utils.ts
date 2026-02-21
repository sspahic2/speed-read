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
