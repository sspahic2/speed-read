"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingControlsLibrary } from "@/components/custom/floating-controls-library";
import BlockPreview from "@/components/custom/block-preview";
import {
  loadFileForEditing,
  updateFileBlocks,
  type LibraryBlock,
} from "@/services/frontend-services/library-service";

type ParsedBlock = {
  id: string;
  text: string;
  type: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  page: number;
};

type TocItem = { id: string; text: string; page: number; ignored: boolean };

export default function LibraryEditPage() {
  const params = useParams();
  const router = useRouter();
  const fileId = params.fileId as string;

  const [fileName, setFileName] = useState("");
  const [blocks, setBlocks] = useState<ParsedBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [tocVisible, setTocVisible] = useState(true);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const ignoredRef = useRef<Map<string, boolean>>(new Map());
  const tocIndexRef = useRef<Map<string, number>>(new Map());
  const tocUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
        idxMap.set(block.id, items.length);
        items.push({
          id: block.id,
          text: block.text.slice(0, 80) || "(empty)",
          page,
          ignored: ignoredRef.current.get(block.id) ?? false,
        });
      });
    });
    tocIndexRef.current = idxMap;
    return items;
  }, [pages]);

  const scheduleTocUpdate = useCallback(() => {
    if (tocUpdateTimeoutRef.current) clearTimeout(tocUpdateTimeoutRef.current);
    tocUpdateTimeoutRef.current = setTimeout(() => {
      setTocItems(buildTocItems());
      setRefreshTrigger((prev) => prev + 1);
    }, 300);
  }, [buildTocItems]);

  useEffect(() => {
    return () => {
      if (tocUpdateTimeoutRef.current) clearTimeout(tocUpdateTimeoutRef.current);
    };
  }, []);

  // Load file data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await loadFileForEditing(fileId);
        if (cancelled) return;

        setFileName(data.fileName);

        const parsed: ParsedBlock[] = (data.blocks ?? []).map((b: LibraryBlock) => ({
          id: b.id ?? "",
          text: b.text ?? "",
          type: b.type ?? "paragraph",
          fontSize: b.fontSize ?? 16,
          fontWeight: b.fontWeight ?? 400,
          lineHeight: b.lineHeight ?? 22,
          page: b.page ?? 1,
        }));

        const nextIgnored = new Map<string, boolean>();
        (data.blocks ?? []).forEach((b: LibraryBlock) => {
          nextIgnored.set(b.id ?? "", b.ignored ?? false);
        });
        ignoredRef.current = nextIgnored;

        setBlocks(parsed);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load file.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [fileId]);

  // Build TOC after blocks load
  useEffect(() => {
    if (blocks.length > 0) {
      setTocItems(buildTocItems());
    }
  }, [blocks, buildTocItems]);

  const setBlockIgnored = useCallback(
    (id: string, ignored: boolean) => {
      ignoredRef.current.set(id, ignored);
      setTocItems((prev) => {
        const idx = tocIndexRef.current.get(id);
        if (idx === undefined || !prev[idx] || prev[idx].ignored === ignored) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ignored };
        return next;
      });
      scheduleTocUpdate();
    },
    [scheduleTocUpdate],
  );

  const onBulkUpdate = useCallback(
    (ids: string[], ignored: boolean) => {
      if (ids.length === 0) return;
      const idsSet = new Set(ids);
      ids.forEach((id) => ignoredRef.current.set(id, ignored));
      setTocItems((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          if (!idsSet.has(item.id) || item.ignored === ignored) return item;
          changed = true;
          return { ...item, ignored };
        });
        return changed ? next : prev;
      });
      scheduleTocUpdate();
    },
    [scheduleTocUpdate],
  );

  async function handleSave() {
    if (blocks.length === 0) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const updatedBlocks = blocks.map((block) => ({
        ...block,
        ignored: ignoredRef.current.get(block.id) ?? false,
      }));
      await updateFileBlocks(fileId, updatedBlocks);
      setSaveMessage("Changes saved.");
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  const handleScrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Loading file...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/library">Back to library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="size-8 p-0" asChild>
                  <Link href="/library">
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
                <div>
                  <CardTitle className="text-base sm:text-lg">Edit blocks</CardTitle>
                  <p className="text-xs text-muted-foreground sm:text-sm">{fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {saveMessage ? (
                  <Badge variant="secondary" className="text-xs">{saveMessage}</Badge>
                ) : null}
                <Button onClick={() => void handleSave()} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Toggle blocks as included or ignored. Ignored blocks won&apos;t appear in the reader.
            </p>
          </CardContent>
        </Card>

        <section
          className="rounded-4xl bg-card/40 px-4 pt-12 shadow-inner shadow-black/20 sm:px-6 overflow-x-hidden"
          style={{ minHeight: "70vh" }}
        >
          {blocks.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl bg-muted/20 text-sm text-muted-foreground">
              This file has no blocks.
            </div>
          ) : (
            <div className="relative overflow-x-hidden">
              <FloatingControlsLibrary
                items={tocItems}
                visible={tocVisible}
                side="left"
                onToggle={() => setTocVisible((prev) => !prev)}
                onSelect={handleScrollTo}
                onBulkUpdate={onBulkUpdate}
              />
              <div className="max-h-[80vh] space-y-8 overflow-y-auto overflow-x-hidden pr-0 md:pr-4">
                {pages.map(({ page, items }) => (
                  <div key={page} className="relative mx-auto max-w-[720px] px-2 py-12 sm:px-4 lg:px-10">
                    <div className="space-y-6">
                      {items.map((block) => (
                        <BlockPreview
                          key={block.id}
                          block={block}
                          ignoredRef={ignoredRef}
                          onSetIgnored={setBlockIgnored}
                          refreshTrigger={refreshTrigger}
                        />
                      ))}
                    </div>
                    <div className="mt-8 flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      <div className="h-px w-full bg-border/60" />
                      <span>Page {page}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
