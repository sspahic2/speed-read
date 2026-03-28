"use client";

import { useCallback, useEffect, useRef, useState as useLocalState } from "react";
import { FloatingControlsReader } from "@/components/custom/floating-controls-reader";
import { ReaderPageProgress } from "@/components/custom/reader-page-progress";
import { ReaderDrawer } from "@/components/custom/reader-drawer";
import { useReaderCountdownGate } from "@/components/hooks/reader/use-reader-countdown-gate";
import { useReaderPlayPauseTrigger } from "@/components/hooks/reader/use-reader-play-pause-trigger";
import { useReaderUiDimmedEffect } from "@/components/hooks/reader/use-reader-ui-dimmed-effect";
import { useReaderViewport } from "@/components/hooks/use-mobile";
import { cn } from "@/components/lib/utils";
import { computeMobileWordFontSize } from "@/lib/reader-utils";
import { OrpWordDisplay } from "@/components/custom/orp-word-display";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Minus, Pause, Play, Plus } from "lucide-react";
import { usePreferences } from "@/components/hooks/use-preferences";
import { useReaderState } from "@/components/hooks/use-reader-state";
import type { LibraryBlock } from "@/services/frontend-services/library-service";
import { useSession } from "next-auth/react";

const PLAY_COUNTDOWN_SECONDS = 3;

function formatTimeRemaining(totalWords: number, progressPercent: number, wpm: number): string {
  if (totalWords <= 0 || wpm <= 0) return "";
  const wordsRemaining = Math.max(0, totalWords - Math.round((progressPercent / 100) * totalWords));
  const minutesLeft = wordsRemaining / wpm;
  if (minutesLeft < 1) {
    const secs = Math.max(Math.round(minutesLeft * 60), 0);
    return secs <= 0 ? "" : `~${secs}s left`;
  }
  const mins = Math.floor(minutesLeft);
  const secs = Math.round((minutesLeft - mins) * 60);
  if (secs === 0) return `~${mins}m left`;
  return `~${mins}m ${secs}s left`;
}

type ReaderExperienceProps = {
  initialBlocks?: LibraryBlock[];
  isSubscribed?: boolean;
};

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

const RING_STROKE = 2.5;

function CountdownRing({ value, size = 80 }: { value: number; size?: number }) {
  const [depleted, setDepleted] = useLocalState(false);
  const radius = (size - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setDepleted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted-foreground/10"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-highlight"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={depleted ? circumference : 0}
          style={{ transition: depleted ? "stroke-dashoffset 1s linear" : "none" }}
        />
      </svg>
      <span
        className="absolute font-semibold leading-none text-foreground"
        style={{ fontSize: `${Math.round(size * 0.35)}px` }}
      >
        {value}
      </span>
    </div>
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
    currentPageTotalWords,
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
    stepForward,
    stepBackward,
    handleCustomTextLoad,
    loadedBlocks,
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
  const [readingMode, setReadingMode] = useLocalState<"flash" | "scroll">("flash");
  const [focusTrigger, setFocusTrigger] = useLocalState(0);

  // Scroll to active word when new content loads (book selected or text pasted)
  const firstBlockIdRef = useRef(loadedBlocks[0]?.id);
  useEffect(() => {
    const firstId = loadedBlocks[0]?.id;
    if (firstBlockIdRef.current === firstId || !firstId) return;
    firstBlockIdRef.current = firstId;
    const t = setTimeout(() => setFocusTrigger((n) => n + 1), 400);
    return () => clearTimeout(t);
  }, [loadedBlocks, setFocusTrigger]);

  // Scroll to active word when playback pauses
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (wasPlayingRef.current && !isPlaying) {
      const t = setTimeout(() => setFocusTrigger((n) => n + 1), 150);
      wasPlayingRef.current = false;
      return () => clearTimeout(t);
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, setFocusTrigger]);
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
    onStepForward: stepForward,
    onStepBackward: stepBackward,
    skipCountdown: readingMode !== "flash",
  });

  useReaderUiDimmedEffect(isReaderUiDimmed);

  // Screen wake lock: prevent screen sleep during reading
  useEffect(() => {
    if (!isPlaying || !("wakeLock" in navigator)) return;
    let released = false;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request("screen").then((l) => {
      if (released) { l.release(); return; }
      lock = l;
    }).catch(() => {});
    return () => { released = true; lock?.release(); };
  }, [isPlaying]);

  const isGuidedMode = readingMode !== "flash";
  const showPageProgress = !isReaderUiDimmed || isGuidedMode;
  const showRsvpOverlay = isReaderUiDimmed && !isGuidedMode;

  const handleModeChange = (mode: "flash" | "scroll") => {
    if (isCountdownActive) cancelCountdown();
    setReadingMode(mode);
    setTimeout(() => setFocusTrigger((n) => n + 1), 150);
  };

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
          onClose={() => setFocusTrigger((n) => n + 1)}
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
            "flex h-full w-full max-w-5xl flex-col items-center",
            isLandscapePhone ? "gap-1" : "gap-2",
          )}
        >
          <div className="flex w-full flex-1 items-center justify-center">
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
                    role={isGuidedMode && isPlaying ? "button" : undefined}
                    tabIndex={isGuidedMode && isPlaying ? -1 : undefined}
                    aria-label={isGuidedMode && isPlaying ? "Tap to pause" : undefined}
                    onClick={isGuidedMode && isReaderUiDimmed ? handlePlayToggle : undefined}
                    className={cn(
                      "absolute inset-0 transition-all ease-out",
                      showPageProgress
                        ? cn("translate-y-0 scale-100 opacity-100", isGuidedMode && isPlaying && "cursor-pointer")
                        : "pointer-events-none translate-y-4 scale-[0.98] opacity-0",
                      showPageProgress ? "duration-500" : "duration-3000",
                    )}
                  >
                    <ReaderPageProgress
                      page={currentPage}
                      blocks={isGuidedMode ? loadedBlocks.filter((b) => { const p = b.page ?? 1; return p >= currentPage - 1 && p <= currentPage + 1; }) : currentPageBlocks}
                      activeBlockId={currentBlockId}
                      activeWordOffset={currentWordOffset}
                      className="h-full"
                      anchorBottom={isGuidedMode}
                      scrollMode={(isGuidedMode && isPlaying) || undefined}
                      focusTrigger={focusTrigger}
                    />
                  </div>

                  {showRsvpOverlay && (
                  <div
                    role="button"
                    tabIndex={-1}
                    aria-label={isPlaying ? "Tap to pause" : isCountdownActive ? "Tap to cancel" : undefined}
                    onClick={handlePlayToggle}
                    className="absolute inset-0 flex cursor-pointer items-center justify-center pt-[8vh]"
                  >
                    {isCountdownActive && countdownValue != null ? (
                      <CountdownRing key={countdownValue} value={countdownValue} size={isLandscapePhone ? 56 : 80} />
                    ) : (
                      <div className="flex w-full flex-col items-center gap-3">
                        <OrpWordDisplay
                          word={currentWord}
                          pastWord={displayedPastWords[0]}
                          futureWord={displayedFutureWords[0]}
                          fontSize={currentWordFontSize}
                          contextFontSize={contextWordFontSize}
                          vertical={isPortraitPhone}
                        />
                      </div>
                    )}
                  </div>
                  )}
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
                    className={cn(
                      "h-12 w-12 rounded-full shadow-sm",
                      isCountdownActive && "animate-pulse ring-2 ring-highlight/40",
                    )}
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
                <WpmFlash wpm={wpm} />
                {/* Mode switcher */}
                <div className="flex items-center rounded-full border border-border/50 bg-card/40 p-0.5">
                  <button
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      readingMode === "flash"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => handleModeChange("flash")}
                  >
                    Flash
                  </button>
                  <button
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      readingMode === "scroll"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => handleModeChange("scroll")}
                  >
                    Scroll
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "w-[75vw] max-w-4xl shrink-0 px-4 transition-opacity ease-out md:px-8",
              progressPaddingClass,
              isReaderUiDimmed
                ? isGuidedMode ? "opacity-30 duration-3000" : "opacity-[0.1] duration-3000"
                : "opacity-100 duration-300",
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {currentPage}</span>
                {formatTimeRemaining(currentPageTotalWords, pageProgressValue, wpm) && (
                  <span className="tabular-nums text-xs">
                    {formatTimeRemaining(currentPageTotalWords, pageProgressValue, wpm)}
                  </span>
                )}
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
                  setTimeout(() => setFocusTrigger((n) => n + 1), 100);
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
