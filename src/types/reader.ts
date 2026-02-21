import type { LibraryBlock, ReaderProgressRecord } from "@/services/frontend-services/library-service";

export type Block = {
  id: string;
  text?: string;
  page?: number;
};

export type Word = {
  word: string;
  blockId: string;
  offset: number;
  page?: number;
};

export type LibraryLoadPayload = {
  blocks: LibraryBlock[];
  progress: ReaderProgressRecord | null;
  fileId: string;
};
