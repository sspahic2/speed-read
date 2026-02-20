"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractDocument, saveLibraryBlocks } from "@/services/frontend-services/library-service";

type ExtractedBlock = {
  text?: string;
  type?: string;
  font_size?: number;
  font_weight?: string;
  line_height?: number;
  page?: number;
  ignored?: boolean;
};

export type ParsedBlock = {
  id: string;
  text: string;
  type: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  page: number;
};

type TocItem = { id: string; text: string; page: number; ignored: boolean };

export function useUploadAndIgnore() {
  const [file, setFile] = useState<File | null>(null);
  const [blocks, setBlocks] = useState<ParsedBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [tocVisible, setTocVisible] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const ignoredRef = useRef<Map<string, boolean>>(new Map());
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const tocUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tocIndexRef = useRef<Map<string, number>>(new Map());

  const pages = useMemo(() => {
    const grouped = new Map<number, ParsedBlock[]>();
    blocks.forEach((block) => {
      const items = grouped.get(block.page) ?? [];
      items.push(block);
      grouped.set(block.page, items);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([page, items]) => ({ page, items }));
  }, [blocks]);

  const buildTocItems = useCallback(() => {
    const items: TocItem[] = [];
    const idxMap = new Map<string, number>();
    pages.forEach(({ page, items: pageItems }) => {
      pageItems.forEach((block) => {
        const entry: TocItem = {
          id: block.id,
          text: block.text.slice(0, 80) || "(empty)",
          page,
          ignored: ignoredRef.current.get(block.id) ?? false,
        };
        idxMap.set(block.id, items.length);
        items.push(entry);
      });
    });
    tocIndexRef.current = idxMap;
    return items;
  }, [pages]);

  useEffect(() => {
    setTocItems(buildTocItems());
  }, [blocks, buildTocItems]);

  const scheduleTocUpdate = useCallback(() => {
    if (tocUpdateTimeoutRef.current) {
      clearTimeout(tocUpdateTimeoutRef.current);
    }
    tocUpdateTimeoutRef.current = setTimeout(() => {
      setTocItems(buildTocItems());
      setRefreshTrigger((prev) => prev + 1);
    }, 300);
  }, [buildTocItems]);

  useEffect(() => {
    return () => {
      if (tocUpdateTimeoutRef.current) {
        clearTimeout(tocUpdateTimeoutRef.current);
      }
    };
  }, []);

  const setBlockIgnored = useCallback(
    (id: string, ignored: boolean) => {
      // Update ref immediately
      ignoredRef.current.set(id, ignored);
      setTocItems((prev) => {
        const idx = tocIndexRef.current.get(id);
        if (idx === undefined || !prev[idx] || prev[idx].ignored === ignored) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ignored };
        return next;
      });
      // Schedule TOC update (debounced) - this will trigger refreshTrigger after delay
      scheduleTocUpdate();
    },
    [scheduleTocUpdate],
  );

  const onBulkUpdate = useCallback(
    (ids: string[], ignored: boolean) => {
      if (ids.length === 0) return;
      const idsSet = new Set(ids);
      // Update all refs first
      ids.forEach((id) => {
        ignoredRef.current.set(id, ignored);
      });

      // Build the entire new tocItems array in one go
      setTocItems((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          if (!idsSet.has(item.id) || item.ignored === ignored) {
            return item;
          }
          changed = true;
          return { ...item, ignored };
        });
        return changed ? next : prev;
      });

      scheduleTocUpdate();
    },
    [scheduleTocUpdate],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!file) {
        setError("Attach a PDF or EPUB before sending.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setHasExtracted(false);

      try {
        const payload = await extractDocument(file);
        const content: ExtractedBlock[] = Array.isArray(payload?.content)
          ? payload.content
          : [];

        const parsed: ParsedBlock[] = content.map((block, index) => {
          const type = (block?.type ?? "paragraph").toString().toLowerCase();
          const fontSize =
            typeof block?.font_size === "number" && block.font_size > 0
              ? block.font_size
              : 16;
          const lineHeight =
            typeof block?.line_height === "number" && block.line_height > 0
              ? block.line_height
              : fontSize * 1.4;
          const fontWeight =
            typeof block?.font_weight === "string" &&
            block.font_weight.toLowerCase() === "bold"
              ? 600
              : 400;
          const page = Number(block?.page) || 1;
          return {
            id: blockAnchorId(page, index),
            text: (block?.text ?? "").toString(),
            type,
            fontSize,
            lineHeight,
            fontWeight,
            page,
          };
        });

        const nextIgnored = new Map<string, boolean>();
        parsed.forEach((block, idx) => {
          const ignoredFlag =
            typeof content[idx]?.ignored === "boolean"
              ? !!content[idx]?.ignored
              : false;
          nextIgnored.set(block.id, ignoredFlag);
        });
        ignoredRef.current = nextIgnored;
        setBlocks(parsed);
        setHasExtracted(true);
        setSaveMessage(null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong while parsing.";
        setError(message);
        setBlocks([]);
      } finally {
        setIsLoading(false);
      }
    },
    [file],
  );

  const handleSave = useCallback(async () => {
    if (blocks.length === 0) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload = {
        fileName: file?.name ?? "library.json",
        blocks: blocks.map((block) => ({
          ...block,
          ignored: ignoredRef.current.get(block.id) ?? false,
        })),
      };
      const res = await saveLibraryBlocks(payload);
      if (res?.fileKey) {
        setSaveMessage("Saved to your library.");
      } else {
        setSaveMessage("Saved.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setSaveMessage(message);
    } finally {
      setIsSaving(false);
    }
  }, [blocks, file]);

  return {
    file,
    setFile,
    blocks,
    error,
    isLoading,
    hasExtracted,
    isSaving,
    saveMessage,
    tocVisible,
    setTocVisible,
    tocItems,
    ignoredRef,
    setBlockIgnored,
    onBulkUpdate,
    handleSubmit,
    handleSave,
    pages,
    refreshTrigger,
  };
}

function blockAnchorId(page: number, index: number) {
  return `page-${page}-block-${index}`;
}
