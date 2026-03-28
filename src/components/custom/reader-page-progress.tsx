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
  scrollMode?: boolean;
  focusTrigger?: number;
  hideGradients?: boolean;
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
  scrollMode?: boolean;
  blockPosition: "before" | "active" | "after";
};

const splitWords = (text?: string) => (text ?? "").split(/\s+/).filter(Boolean);
const SENTENCES_PER_ROW = 5;
const PHRASE_AHEAD = 2;

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

const ACTIVE_HIGHLIGHT = "bg-highlight text-background shadow-[0_8px_24px_hsl(var(--highlight)/0.25),0_0_60px_hsl(var(--highlight)/0.08)]";

const ProgressBlock = memo(function ProgressBlock({
  block,
  isActiveBlock,
  activeWordOffset,
  activeWordRef,
  scrollMode,
  blockPosition,
}: ProgressBlockProps) {
  const getWordClass = (isActiveWord: boolean, offset: number) => {
    const base = "whitespace-nowrap rounded-md px-1 py-0.5 transition-[background-color,opacity,box-shadow] duration-300";

    if (isActiveWord) return cn(base, ACTIVE_HIGHLIGHT);
    if (!scrollMode) return cn(base, "text-inherit");

    const phraseEnd = activeWordOffset + PHRASE_AHEAD;

    // Active phrase: current word + next 2 words get highlight background
    if (blockPosition === "active" && offset > activeWordOffset && offset <= phraseEnd) {
      return cn(base, "bg-highlight/15 text-foreground");
    }

    // Future words beyond phrase: hidden (reveal)
    if (blockPosition === "after") return cn(base, "opacity-0");
    if (blockPosition === "active" && offset > phraseEnd) return cn(base, "opacity-0");

    // Past words: graduated spotlight fade
    if (blockPosition === "before") return cn(base, "text-foreground/[0.06]");
    const distance = activeWordOffset - offset;
    if (distance <= 3) return cn(base, "text-foreground/70");
    if (distance <= 7) return cn(base, "text-foreground/40");
    if (distance <= 12) return cn(base, "text-foreground/20");
    return cn(base, "text-foreground/[0.08]");
  };

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
                className={getWordClass(isActiveWord, offset)}
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
  scrollMode,
  focusTrigger,
  hideGradients = false,
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

  const activeBlockIndex = useMemo(
    () => pageBlocks.findIndex((b) => b.id === activeBlockId),
    [pageBlocks, activeBlockId],
  );

  useEffect(() => {
    if (!scrollMode) return;

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
  }, [scrollMode, page, activeBlockId, activeWordOffset, anchorBottom, updateBottomFade]);

  // One-time scroll to active word (e.g. when drawer closes)
  useEffect(() => {
    if (!focusTrigger) return;
    // Delay to let drawer close animation finish before measuring layout
    const timeout = window.setTimeout(() => {
      const wordEl = activeWordElementRef.current;
      const container = scrollContainerRef.current;
      if (!wordEl || !container) return;
      const containerHeight = container.clientHeight;
      const wordRect = wordEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const wordTopInContent = wordRect.top - containerRect.top + container.scrollTop;
      const targetScroll = Math.max(0, wordTopInContent - containerHeight / 2 + wordRect.height / 2);
      container.scrollTo({ top: targetScroll, behavior: "smooth" });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [focusTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

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
        style={{ contentVisibility: "auto", scrollbarWidth: "none", msOverflowStyle: "none", letterSpacing: "0.01em", wordSpacing: "0.05em", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        {pageBlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No readable text was found for this page.</p>
        ) : (
          <div className="space-y-5">
            {pageBlocks.map((block, idx) => (
              <ProgressBlock
                key={block.id}
                block={block}
                isActiveBlock={block.id === activeBlockId}
                activeWordOffset={block.id === activeBlockId ? activeWordOffset : -1}
                activeWordRef={block.id === activeBlockId ? setActiveWordElementRef : undefined}
                scrollMode={scrollMode}
                blockPosition={idx < activeBlockIndex ? "before" : idx === activeBlockIndex ? "active" : "after"}
              />
            ))}
          </div>
        )}
      </div>

      {!hideGradients && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background to-transparent" />
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/60 to-transparent transition-opacity duration-300",
              showBottomFade ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      )}
    </section>
  );
}
