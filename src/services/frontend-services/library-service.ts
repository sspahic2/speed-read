import { del, get, patch, post } from "@/services/base-service";

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

export async function loadFileForEditing(fileId: string) {
  return get<{
    fileId: string;
    fileName: string;
    blocks: Array<LibraryBlock>;
  }>("/api/library/update", { query: { fileId } });
}

export async function updateFileBlocks(fileId: string, blocks: Array<LibraryBlock>) {
  return post<{ ok: true }>("/api/library/update", { fileId, blocks });
}

export async function saveTextEntry(title: string, text: string) {
  return post<{ ok: true; fileKey: string; url: string }>("/api/library/text", { title, text });
}

export async function renameLibraryFile(fileId: string, fileName: string) {
  return patch<{ ok: true }>("/api/library/load", { fileId, fileName });
}

export async function deleteLibraryFile(fileId: string) {
  return del<{ ok: true }>("/api/library/load", { fileId });
}

export type LibraryFileListItem = {
  id: string;
  fileKey: string;
  fileUrl: string;
  fileName: string;
  sourceType: string;
  createdAt: string;
};
