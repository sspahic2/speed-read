"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/components/lib/utils";
import type { LibraryBlock } from "@/services/frontend-services/library-service";

type ReaderPageProgressProps = {
  page: number;
  blocks: LibraryBlock[];
  activeBlockId: string;
  activeWordOffset: number;
  className?: string;
};

type RowWord = {
  word: string;
  offset: number;
};

type PageBlock = {
  id: string;
  type?: string;
  rows: RowWord[][];
};

type ProgressBlockProps = {
  block: PageBlock;
  isActiveBlock: boolean;
  activeWordOffset: number;
  activeWordRef?: (node: HTMLSpanElement | null) => void;
};

const splitWords = (text?: string) => (text ?? "").split(/\s+/).filter(Boolean);
const SENTENCES_PER_ROW = 5;

const splitSentences = (text?: string) => {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g);
  return (matches ?? [normalized]).map((sentence) => sentence.trim()).filter(Boolean);
};

const chunkSentencesIntoRows = (text?: string): RowWord[][] => {
  const sentences = splitSentences(text);
  const rows: RowWord[][] = [];
  let globalOffset = 0;

  for (let i = 0; i < sentences.length; i += SENTENCES_PER_ROW) {
    const rowText = sentences.slice(i, i + SENTENCES_PER_ROW).join(" ");
    const rowWords = splitWords(rowText).map((word) => ({
      word,
      offset: globalOffset++,
    }));
    if (rowWords.length > 0) {
      rows.push(rowWords);
    }
  }

  return rows;
};

const getBlockTextClass = (type?: string) => {
  if (type === "heading") {
    return "font-semibold uppercase tracking-[0.14em] text-foreground";
  }

  if (type === "special_paragraph") {
    return "italic text-foreground/85";
  }

  return "text-foreground/85";
};

const ProgressBlock = memo(function ProgressBlock({
  block,
  isActiveBlock,
  activeWordOffset,
  activeWordRef,
}: ProgressBlockProps) {
  return (
    <div className={cn("space-y-1", getBlockTextClass(block.type))}>
      {block.rows.map((row, rowIdx) => (
        <p
          key={`${block.id}-row-${rowIdx}`}
          className="flex flex-wrap items-stretch gap-x-1.5 gap-y-1 text-sm leading-7 md:text-base md:leading-7"
        >
          {row.map(({ word, offset }) => {
            const isActiveWord = isActiveBlock && offset === activeWordOffset;
            return (
              <span
                key={`${block.id}-${offset}`}
                ref={isActiveWord ? activeWordRef : undefined}
                className={cn(
                  "rounded-md px-1 py-0.5 transition-colors duration-200",
                  isActiveWord
                    ? "bg-highlight text-background shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_12px_30px_hsl(var(--primary)/0.12)]"
                    : "text-inherit",
                )}
              >
                {word}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
});

export function ReaderPageProgress({
  page,
  blocks,
  activeBlockId,
  activeWordOffset,
  className,
}: ReaderPageProgressProps) {
  const activeWordElementRef = useRef<HTMLSpanElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const setActiveWordElementRef = useCallback((node: HTMLSpanElement | null) => {
    if (node) {
      activeWordElementRef.current = node;
    }
  }, []);

  const updateBottomFade = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowBottomFade(remaining > 2);
  }, []);

  const pageBlocks = useMemo(
    () =>
      blocks
        .map((block) => ({
          id: block.id,
          type: block.type,
          rows: chunkSentencesIntoRows(block.text),
        }))
        .filter((block) => block.rows.length > 0),
    [blocks],
  );

  useEffect(() => {
    activeWordElementRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
    const timeout = window.setTimeout(() => updateBottomFade(), 240);
    return () => window.clearTimeout(timeout);
  }, [page, activeBlockId, updateBottomFade]);

  useEffect(() => {
    updateBottomFade();
    const onResize = () => updateBottomFade();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pageBlocks, updateBottomFade]);

  return (
    <section
      aria-label={`Reading progress on page ${page}`}
      className={cn("relative overflow-hidden", className)}
    >
      <div className="pointer-events-none absolute inset-0" />

      <div
        ref={scrollContainerRef}
        onScroll={updateBottomFade}
        className="reader-page-progress-scroll relative h-full overflow-y-auto px-6 pb-5 pt-1 md:px-6 md:pb-6"
        style={{ contentVisibility: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {pageBlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No readable text was found for this page.</p>
        ) : (
          <div className="space-y-1">
            {pageBlocks.map((block) => (
              <ProgressBlock
                key={block.id}
                block={block}
                isActiveBlock={block.id === activeBlockId}
                activeWordOffset={block.id === activeBlockId ? activeWordOffset : -1}
                activeWordRef={block.id === activeBlockId ? setActiveWordElementRef : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background via-background/65 to-transparent backdrop-blur-sm transition-opacity duration-200",
          showBottomFade ? "opacity-100" : "opacity-0",
        )}
      />
    </section>
  );
}
