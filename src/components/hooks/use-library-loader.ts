"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listLibraryFiles,
  loadLibraryFile,
  type LibraryFileListItem,
  type LibraryBlock,
  type ReaderProgressRecord,
} from "@/services/frontend-services/library-service";

type LoadedPayload = {
  blocks: LibraryBlock[];
  progress: ReaderProgressRecord | null;
  fileId: string;
  fileKey: string;
};

export type UseLibraryLoaderReturn = {
  open: boolean;
  setOpen: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  files: LibraryFileListItem[];
  loadingFileId: string | null;
  selectedFile: { id: string; name: string } | null;
  handleLoad: (fileId: string, fileKey: string, fileUrl?: string) => Promise<void>;
  setError: (message: string | null) => void;
};

export function useLibraryLoader(onLoaded?: (payload: LoadedPayload) => void): UseLibraryLoaderReturn {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<LibraryFileListItem[]>([]);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listLibraryFiles();
        setFiles(res?.files ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load library files.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [open]);

  const handleLoad = useCallback(
    async (fileId: string, fileKey: string, fileUrl?: string) => {
      const found = files.find((f) => f.id === fileId);
      setSelectedFile({ id: fileId, name: found?.fileName ?? "Selected file" });
      setLoadingFileId(fileId);
      try {
        const res = await loadLibraryFile(fileId, fileKey, fileUrl);
        if (res?.ok && onLoaded) {
          onLoaded({ blocks: res.blocks, progress: res.progress, fileId, fileKey });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load file.";
        setError(msg);
      } finally {
        setLoadingFileId(null);
        setOpen(false);
      }
    },
    [files, onLoaded],
  );

  return {
    open,
    setOpen,
    loading,
    error,
    files,
    loadingFileId,
    selectedFile,
    handleLoad,
    setError,
  };
}
