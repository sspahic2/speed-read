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
  anchorBottom?: boolean;
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

  return "text-foreground/80";
};

const ProgressBlock = memo(function ProgressBlock({
  block,
  isActiveBlock,
  activeWordOffset,
  activeWordRef,
}: ProgressBlockProps) {
  return (
    <div className={cn("space-y-1.5", getBlockTextClass(block.type))}>
      {block.rows.map((row, rowIdx) => (
        <p
          key={`${block.id}-row-${rowIdx}`}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5 text-[17px] leading-[1.6] md:text-lg md:leading-[1.65]"
        >
          {row.map(({ word, offset }) => {
            const isActiveWord = isActiveBlock && offset === activeWordOffset;
            return (
              <span
                key={`${block.id}-${offset}`}
                ref={isActiveWord ? activeWordRef : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-1 py-0.5 transition-colors duration-200",
                  isActiveWord
                    ? "bg-highlight text-background shadow-[0_8px_24px_hsl(var(--highlight)/0.25),0_0_60px_hsl(var(--highlight)/0.08)]"
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
  anchorBottom = false,
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
    const wordEl = activeWordElementRef.current;
    const container = scrollContainerRef.current;
    if (!wordEl || !container) return;

    const containerHeight = container.clientHeight;
    const wordRect = wordEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const wordTopInContent = wordRect.top - containerRect.top + container.scrollTop;
    // anchorBottom: position the word just above the bottom fade (h-20 = 80px + 20px padding)
    const anchorY = anchorBottom ? containerHeight - 100 : containerHeight / 2;
    const targetScroll = Math.max(0, wordTopInContent - anchorY + wordRect.height / 2);

    // Large jump (page change): snap immediately
    if (Math.abs(container.scrollTop - targetScroll) > containerHeight) {
      container.scrollTop = targetScroll;
      updateBottomFade();
      return;
    }

    // Smooth lerp scroll
    let raf: number;
    const animate = () => {
      const current = container.scrollTop;
      const remaining = targetScroll - current;
      if (Math.abs(remaining) < 0.5) {
        container.scrollTop = targetScroll;
        updateBottomFade();
        return;
      }
      container.scrollTop = current + remaining * 0.08;
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(raf);
  }, [page, activeBlockId, activeWordOffset, anchorBottom, updateBottomFade]);

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
      <div
        ref={scrollContainerRef}
        onScroll={updateBottomFade}
        className="reader-page-progress-scroll relative mx-auto h-full max-w-4xl overflow-y-auto px-4 pb-5 pt-1 antialiased md:px-8 md:pb-6"
        style={{ contentVisibility: "auto", scrollbarWidth: "none", msOverflowStyle: "none", letterSpacing: "0.01em", wordSpacing: "0.05em" }}
      >
        {pageBlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No readable text was found for this page.</p>
        ) : (
          <div className="space-y-5">
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

      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background to-transparent" />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/60 to-transparent backdrop-blur-sm transition-opacity duration-300",
          showBottomFade ? "opacity-100" : "opacity-0",
        )}
      />
    </section>
  );
}
