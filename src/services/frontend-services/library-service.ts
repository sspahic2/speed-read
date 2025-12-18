import { get, post } from "@/services/base-service";

type ExtractResponse = {
  content?: Array<{
    text?: string;
    type?: string;
    font_size?: number;
    font_weight?: string;
    line_height?: number;
    page?: number;
    ignored?: boolean;
  }>;
  [key: string]: unknown;
};

export async function extractDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return post<ExtractResponse>("/api/library/extract", formData);
}

export type LibraryBlock = {
  id: string;
  text?: string;
  type?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  page?: number;
  ignored?: boolean;
};

export type ReaderProgressRecord = {
  id: string;
  userId: string;
  fileId: string;
  blockId: string;
  offset: number;
  updatedAt: string;
};

type SaveLibraryPayload = {
  fileName?: string;
  blocks: Array<{
    id: string;
    text: string;
    type: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    page: number;
    ignored: boolean;
  }>;
};

export async function saveLibraryBlocks(payload: SaveLibraryPayload) {
  return post<{ ok: true; fileKey: string }>("/api/library/save", payload);
}

export async function saveReaderProgress(params: {
  fileId: string;
  blockId: string;
  offset: number;
}) {
  return post<{ ok: true }>("/api/library/progress", params);
}

export async function listLibraryFiles() {
  return get<{
    files: Array<LibraryFileListItem>;
  }>("/api/library/load");
}

export async function loadLibraryFile(fileId: string, fileKey: string, fileUrl?: string) {
  return post<{ ok: true; progress: ReaderProgressRecord | null; blocks: LibraryBlock[] }>(
    "/api/library/load",
    { fileId, fileKey, fileUrl },
  );
}

export type LibraryFileListItem = {
  id: string;
  fileKey: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
};
