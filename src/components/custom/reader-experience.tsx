"use client";

import { useCallback, useEffect, useRef, useState as useLocalState } from "react";
import type { CSSProperties } from "react";
import { FloatingControlsReader } from "@/components/custom/floating-controls-reader";
import { ReaderPageProgress } from "@/components/custom/reader-page-progress";
import { ReaderDrawer } from "@/components/custom/reader-drawer";
import { useReaderCountdownGate } from "@/components/hooks/reader/use-reader-countdown-gate";
import { useReaderPlayPauseTrigger } from "@/components/hooks/reader/use-reader-play-pause-trigger";
import { useReaderUiDimmedEffect } from "@/components/hooks/reader/use-reader-ui-dimmed-effect";
import { useReaderViewport } from "@/components/hooks/use-mobile";
import { cn } from "@/components/lib/utils";
import { computeMobileWordFontSize, splitWordAtPivot } from "@/lib/reader-utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Minus, Pause, Play, Plus } from "lucide-react";
import { usePreferences } from "@/components/hooks/use-preferences";
import { useReaderState } from "@/components/hooks/use-reader-state";
import type { LibraryBlock } from "@/services/frontend-services/library-service";
import { useSession } from "next-auth/react";

const PLAY_COUNTDOWN_SECONDS = 3;

type HighlightedWordProps = {
  word: string;
  className?: string;
  style?: CSSProperties;
  highlightPivot?: boolean;
};

type ReaderExperienceProps = {
  initialBlocks?: LibraryBlock[];
  isSubscribed?: boolean;
};

function HighlightedWord({ word, className, style, highlightPivot = true }: HighlightedWordProps) {
  if (!highlightPivot) {
    return (
      <span className={cn("whitespace-nowrap", className)} style={style}>
        {word}
      </span>
    );
  }

  const { prefix, pivot, suffix } = splitWordAtPivot(word);

  return (
    <span className={cn("whitespace-nowrap", className)} style={style}>
      {prefix}
      <span className="text-highlight">{pivot || " "}</span>
      {suffix}
    </span>
  );
}

function WpmFlash({ wpm }: { wpm: number }) {
  const [visible, setVisible] = useLocalState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 1200);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [wpm]);

  return (
    <span
      className={cn(
        "text-sm font-semibold tabular-nums tracking-wide text-foreground transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      {wpm} wpm
    </span>
  );
}

export function ReaderExperience({ initialBlocks, isSubscribed: initialIsSubscribed = false }: ReaderExperienceProps) {
  const { data: session, status } = useSession();
  const {
    isPhone,
    isPortraitPhone,
    isLandscapePhone,
    isPortraitTablet,
    useMobileControls,
  } = useReaderViewport();
  const {
    fontSize,
    wpm,
    wordIndex,
    isPlaying,
    setIsPlaying,
    rampSeconds,
    currentWord,
    displayedPastWords,
    displayedFutureWords,
    pageProgressValue,
    currentPage,
    currentPageBlocks,
    currentBlockId,
    currentWordOffset,
    floatingControls,
    library,
    seekWithinPage,
    endSeek,
    onFontSizeChange,
    onWpmChange,
    onRampSecondsChange,
    setFontSize,
    setWpm,
    setRampSeconds,
    handleCustomTextLoad,
  } = useReaderState({ initialBlocks });

  usePreferences({
    isAuthenticated: status === "authenticated",
    fontSize,
    wpm,
    rampSeconds,
    onLoaded: useCallback((s) => {
      if (s.fontSize != null) setFontSize(s.fontSize);
      if (s.wpm != null) setWpm(s.wpm);
      if (s.rampSeconds != null) setRampSeconds(s.rampSeconds);
    }, [setFontSize, setWpm, setRampSeconds]),
  });

  const contextWordFontSize = Math.max(fontSize * 0.55, 14);
  const currentWordFontSize = isPhone ? computeMobileWordFontSize(fontSize, currentWord) : fontSize;
  const useSplitDrawerLayout = isLandscapePhone || isPortraitTablet;
  const hasSubscriptionAccess = Boolean(session?.user?.isSubscribed) || initialIsSubscribed;
  const handleCountdownComplete = useCallback(() => {
    setIsPlaying(true);
  }, [setIsPlaying]);

  const { countdownValue, isCountdownActive, startCountdown, cancelCountdown } = useReaderCountdownGate({
    seconds: PLAY_COUNTDOWN_SECONDS,
    onCountdownComplete: handleCountdownComplete,
  });

  const { handlePlayToggle, isReaderUiDimmed } = useReaderPlayPauseTrigger({
    isPlaying,
    setIsPlaying,
    isCountdownActive,
    startCountdown,
    cancelCountdown,
  });

  useReaderUiDimmedEffect(isReaderUiDimmed);

  const progressPaddingClass = useMobileControls
    ? isLandscapePhone
      ? "pb-[calc(env(safe-area-inset-bottom)+2.25rem)]"
      : "pb-[calc(env(safe-area-inset-bottom)+4.5rem)]"
    : "pb-0";

  const handleFontSizeChange = (value: number) => {
    if (isCountdownActive) cancelCountdown();
    onFontSizeChange(value);
  };

  const handleWpmChange = (value: number) => {
    if (isCountdownActive) cancelCountdown();
    onWpmChange(value);
  };

  const handleRampSecondsChange = (value: number) => {
    if (isCountdownActive) cancelCountdown();
    onRampSecondsChange(value);
  };

  const handleSeekWithinPage = (value: number) => {
    if (isCountdownActive) cancelCountdown();
    seekWithinPage(value);
  };

  return (
    <div className="relative overflow-hidden bg-background text-foreground">
      <div
        className={cn(
          "transition-opacity ease-out",
          isReaderUiDimmed ? "pointer-events-none opacity-0 duration-3000" : "opacity-100 duration-300",
        )}
      >
        <ReaderDrawer
          fontSize={fontSize}
          wpm={wpm}
          currentWord={currentWord}
          onFontSizeChange={handleFontSizeChange}
          onWpmChange={handleWpmChange}
          rampSeconds={rampSeconds}
          onRampSecondsChange={handleRampSecondsChange}
          library={library}
          isAuthenticated={status === "authenticated"}
          isSubscribed={hasSubscriptionAccess}
          useMobileLayout={useMobileControls}
          isLandscape={isLandscapePhone}
          useSplitLayout={useSplitDrawerLayout}
          onPasteLoad={handleCustomTextLoad}
        />
      </div>
      <div
        className={cn(
          "relative mx-auto flex w-full flex-col items-center",
          isLandscapePhone
            ? "h-[calc(100dvh-5rem)] gap-2 overflow-y-auto px-4 py-2"
            : "h-[calc(100dvh-6rem)] gap-4 overflow-hidden px-5 py-4 md:py-5",
        )}
      >
        {!useMobileControls ? (
          <div
            className={cn(
              "transition-opacity ease-out",
              isReaderUiDimmed ? "pointer-events-none opacity-0 duration-3000" : "opacity-100 duration-300",
            )}
          >
            <FloatingControlsReader
              visible={floatingControls.isVisible}
              side={floatingControls.side}
              onToggle={() => floatingControls.setIsVisible((prev) => !prev)}
              fontSize={fontSize}
              wpm={wpm}
              rampSeconds={rampSeconds}
              onFontSizeChange={handleFontSizeChange}
              onWpmChange={handleWpmChange}
              onRampSecondsChange={handleRampSecondsChange}
              library={library}
              isAuthenticated={status === "authenticated"}
              isSubscribed={hasSubscriptionAccess}
              onPasteLoad={handleCustomTextLoad}
            />
          </div>
        ) : null}

        <main
          className={cn(
            "flex h-full w-full max-w-5xl flex-1 flex-col items-center justify-between",
            isLandscapePhone ? "gap-2" : "gap-4",
          )}
        >
          <div className="flex w-full items-center justify-center">
            <div
              className={cn(
                "flex w-[95vw] max-w-6xl flex-col items-center px-4 md:px-8",
                isLandscapePhone ? "gap-3" : "gap-6",
              )}
            >
              <div className="w-full">
                <div
                  className={cn(
                    "relative",
                    isLandscapePhone ? "h-[clamp(10rem,36vh,14rem)]" : "h-[clamp(18rem,50vh,34rem)]",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-0 transition-all ease-out",
                      isReaderUiDimmed
                        ? "pointer-events-none translate-y-4 scale-[0.98] opacity-0"
                        : "translate-y-0 scale-100 opacity-100",
                      isReaderUiDimmed ? "duration-3000" : "duration-500",
                    )}
                  >
                    <ReaderPageProgress
                      page={currentPage}
                      blocks={currentPageBlocks}
                      activeBlockId={currentBlockId}
                      activeWordOffset={currentWordOffset}
                      className="h-full"
                    />
                  </div>

                  <div
                    role="button"
                    tabIndex={-1}
                    aria-label={isPlaying ? "Tap to pause" : isCountdownActive ? "Tap to cancel" : undefined}
                    onClick={() => {
                      if (isReaderUiDimmed) handlePlayToggle();
                    }}
                    className={cn(
                      "absolute inset-0 flex items-center justify-center transition-all ease-out",
                      isReaderUiDimmed
                        ? "translate-y-0 scale-100 cursor-pointer opacity-100"
                        : "pointer-events-none -translate-y-4 scale-[1.01] opacity-0",
                      isReaderUiDimmed ? "duration-500" : "duration-400",
                    )}
                  >
                    {isCountdownActive ? (
                      <div className="flex flex-col items-center gap-2 text-center">
                        <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                          Starting in
                        </span>
                        <span
                          className="font-semibold tracking-tight text-foreground"
                          style={{ fontSize: `${Math.max(currentWordFontSize * 1.2, 38)}px`, lineHeight: 1 }}
                        >
                          {countdownValue}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className={cn(
                            "flex items-center justify-center",
                            isPortraitPhone ? "flex-col gap-2" : "flex-row gap-6 md:gap-8",
                          )}
                        >
                          <div
                            className={cn(
                              "flex min-h-[1.2em] items-center justify-center",
                              !isPortraitPhone && "min-w-[8ch]",
                            )}
                          >
                            {displayedPastWords.length > 0 ? (
                              displayedPastWords.map((word, idx) => (
                                <HighlightedWord
                                  key={`past-${idx}-${wordIndex}`}
                                  word={word}
                                  className="text-center text-muted-foreground opacity-70"
                                  highlightPivot={false}
                                  style={{
                                    fontSize: `${contextWordFontSize}px`,
                                    lineHeight: 1.4,
                                  }}
                                />
                              ))
                            ) : (
                              <span className="select-none text-transparent" aria-hidden="true">
                                .
                              </span>
                            )}
                          </div>
                          <HighlightedWord
                            key={wordIndex}
                            word={currentWord}
                            className="focus-word font-semibold tracking-tight"
                            style={{ fontSize: `${currentWordFontSize}px`, lineHeight: 1.4 }}
                          />
                          <div
                            className={cn(
                              "flex min-h-[1.2em] items-center justify-center",
                              !isPortraitPhone && "min-w-[8ch]",
                            )}
                          >
                            {displayedFutureWords.length > 0 ? (
                              displayedFutureWords.map((word, idx) => (
                                <HighlightedWord
                                  key={`future-${idx}-${wordIndex}`}
                                  word={word}
                                  className="text-center text-muted-foreground opacity-70"
                                  highlightPivot={false}
                                  style={{
                                    fontSize: `${contextWordFontSize}px`,
                                    lineHeight: 1.4,
                                  }}
                                />
                              ))
                            ) : (
                              <span className="select-none text-transparent" aria-hidden="true">
                                .
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-3">
                  {/* Quick WPM decrease */}
                  {useMobileControls ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); setWpm(Math.max(150, wpm - 10)); }}
                      aria-label="Decrease speed"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  ) : null}

                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-12 w-12 rounded-full shadow-sm"
                    onClick={handlePlayToggle}
                    aria-label={isPlaying ? "Pause" : isCountdownActive ? "Cancel countdown" : "Start"}
                  >
                    {isPlaying || isCountdownActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>

                  {/* Quick WPM increase */}
                  {useMobileControls ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); setWpm(Math.min(350, wpm + 10)); }}
                      aria-label="Increase speed"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                {useMobileControls ? (
                  <WpmFlash wpm={wpm} />
                ) : null}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "w-[75vw] max-w-4xl shrink-0 px-4 transition-opacity ease-out md:px-8",
              progressPaddingClass,
              isReaderUiDimmed ? "opacity-[0.1] duration-3000" : "opacity-100 duration-300",
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {currentPage}</span>
                <span>{Math.round(pageProgressValue)}%</span>
              </div>
              <Slider
                value={[pageProgressValue]}
                max={100}
                step={1}
                disabled={isPlaying}
                onValueChange={(values) => {
                  if (isPlaying) return;
                  const next = values[0] ?? pageProgressValue;
                  handleSeekWithinPage(next);
                }}
                onValueCommit={() => {
                  if (isPlaying) return;
                  endSeek();
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
