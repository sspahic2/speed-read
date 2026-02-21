"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { splitWordAtPivot } from "@/lib/reader-utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/components/lib/utils";
import { useReaderCountdownGate } from "@/components/hooks/reader/use-reader-countdown-gate";
import { useReaderPlayPauseTrigger } from "@/components/hooks/reader/use-reader-play-pause-trigger";
import { useReaderUiDimmedEffect } from "@/components/hooks/reader/use-reader-ui-dimmed-effect";

type TermsRsvpControlsProps = {
  targetId: string;
};

type TokenKind = "heading" | "body" | "list";

type RsvpToken = {
  text: string;
  kind: TokenKind;
};

const DEFAULT_WPM = 280;
const MIN_WPM = 120;
const MAX_WPM = 600;
const PLAY_COUNTDOWN_SECONDS = 3;

function cleanNodeText(text: string | null): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function splitIntoWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function mapNodeToKind(tagName: string): TokenKind {
  if (tagName === "li") return "list";
  if (tagName.startsWith("h")) return "heading";
  return "body";
}

function getTokensFromArticle(article: HTMLElement | null): RsvpToken[] {
  if (!article) return [];

  const nodes = article.querySelectorAll("h1, h2, h3, p, li");
  const tokens: RsvpToken[] = [];

  nodes.forEach((node) => {
    const text = cleanNodeText(node.textContent);
    if (!text) return;
    const kind = mapNodeToKind(node.tagName.toLowerCase());

    splitIntoWords(text).forEach((word) => {
      tokens.push({ text: word, kind });
    });
  });

  return tokens;
}

function kindLabel(kind: TokenKind | undefined): string {
  if (kind === "heading") return "Heading";
  if (kind === "list") return "List item";
  return "Body text";
}

function HighlightedWord({ word }: { word: string }) {
  const { prefix, pivot, suffix } = splitWordAtPivot(word);

  return (
    <span className="whitespace-nowrap text-4xl font-semibold tracking-tight md:text-6xl">
      {prefix}
      <span className="text-highlight">{pivot || " "}</span>
      {suffix}
    </span>
  );
}

export function TermsRsvpControls({ targetId }: TermsRsvpControlsProps) {
  const [tokens, setTokens] = useState<RsvpToken[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [wpm, setWpm] = useState(DEFAULT_WPM);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleCountdownComplete = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const { countdownValue, isCountdownActive, startCountdown, cancelCountdown } = useReaderCountdownGate({
    seconds: PLAY_COUNTDOWN_SECONDS,
    onCountdownComplete: handleCountdownComplete,
  });

  const startCountdownIfReady = useCallback(() => {
    if (tokens.length === 0) return;
    startCountdown();
  }, [tokens.length, startCountdown]);

  const { handlePlayToggle, isReaderUiDimmed } = useReaderPlayPauseTrigger({
    isPlaying,
    setIsPlaying,
    isCountdownActive,
    startCountdown: startCountdownIfReady,
    cancelCountdown,
  });

  useReaderUiDimmedEffect(isReaderUiDimmed);

  useEffect(() => {
    const article = document.getElementById(targetId);
    setTokens(getTokensFromArticle(article));
  }, [targetId]);

  useEffect(() => {
    if (!isPlaying) return;
    if (tokens.length === 0) return;
    if (wordIndex >= tokens.length - 1) {
      setIsPlaying(false);
      return;
    }

    const intervalMs = Math.max(45, Math.round(60000 / wpm));
    const timer = window.setTimeout(() => {
      setWordIndex((prev) => Math.min(prev + 1, tokens.length - 1));
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [isPlaying, tokens.length, wordIndex, wpm]);

  useEffect(() => {
    if (tokens.length > 0) {
      setWordIndex((prev) => Math.min(prev, tokens.length - 1));
      return;
    }
    cancelCountdown();
    setWordIndex(0);
    setIsPlaying(false);
  }, [tokens.length, cancelCountdown]);

  const currentToken = tokens[wordIndex];
  const progress = useMemo(() => {
    if (tokens.length <= 1) return 0;
    return (wordIndex / (tokens.length - 1)) * 100;
  }, [tokens.length, wordIndex]);

  const remainingWords = Math.max(tokens.length - wordIndex - 1, 0);

  const handleRestart = () => {
    cancelCountdown();
    setIsPlaying(false);
    setWordIndex(0);
  };

  const handleProgressChange = (value: number) => {
    if (tokens.length === 0) return;
    cancelCountdown();
    setIsPlaying(false);
    const normalized = Math.max(0, Math.min(100, value));
    const nextIndex = Math.round((normalized / 100) * Math.max(tokens.length - 1, 0));
    setWordIndex(nextIndex);
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">RSVP Reader</h2>
          <p className="text-sm text-muted-foreground">
            Every heading and paragraph below can be played one word at a time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handlePlayToggle}
            disabled={tokens.length === 0}
          >
            {isPlaying ? "Pause" : isCountdownActive ? "Cancel Countdown" : "Play"}
          </Button>
          <Button type="button" variant="outline" onClick={handleRestart} disabled={tokens.length === 0}>
            Restart
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-background/70 px-4 py-10 text-center">
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Preparing RSVP text...</p>
        ) : isCountdownActive ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Starting In</p>
            <p className="text-5xl font-semibold tracking-tight text-foreground md:text-6xl">{countdownValue}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              {kindLabel(currentToken?.kind)}
            </p>
            <HighlightedWord word={currentToken?.text ?? "Ready"} />
            <p className="text-xs text-muted-foreground">
              Word {wordIndex + 1} of {tokens.length}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress {Math.round(progress)}%</span>
            <span>{remainingWords} words left</span>
          </div>
          <Slider
            value={[progress]}
            min={0}
            max={100}
            step={1}
            onValueChange={(values) => handleProgressChange(values[0] ?? 0)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Reading speed</span>
            <span className={cn("font-medium text-foreground")}>{wpm} WPM</span>
          </div>
          <Slider
            value={[wpm]}
            min={MIN_WPM}
            max={MAX_WPM}
            step={10}
            onValueChange={(values) => {
              cancelCountdown();
              setIsPlaying(false);
              setWpm(values[0] ?? DEFAULT_WPM);
            }}
          />
        </div>
      </div>
    </section>
  );
}
