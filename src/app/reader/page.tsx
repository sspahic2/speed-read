"use client";

import { FloatingControlsReader } from "@/components/custom/floating-controls-reader";
import { ReaderPageProgress } from "@/components/custom/reader-page-progress";
import { ReaderDrawer } from "@/components/custom/reader-drawer";
import { cn } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Pause, Play } from "lucide-react";
import { useReaderState } from "@/components/hooks/use-reader-state";
import { useSession } from "next-auth/react";

export default function ReaderPage() {
  const { status } = useSession();
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
  } = useReaderState();

  return (
    <div className="relative overflow-hidden bg-background text-foreground">
      <ReaderDrawer
        fontSize={fontSize}
        wpm={wpm}
        onFontSizeChange={onFontSizeChange}
        onWpmChange={onWpmChange}
        rampSeconds={rampSeconds}
        onRampSecondsChange={onRampSecondsChange}
        library={library}
        isAuthenticated={status === "authenticated"}
      />
      <div className="relative mx-auto flex h-[calc(100dvh-6rem)] w-full flex-col items-center gap-4 overflow-hidden px-5 py-4 md:py-5">
        <FloatingControlsReader
          visible={floatingControls.isVisible}
          side={floatingControls.side}
          onToggle={() => floatingControls.setIsVisible((prev) => !prev)}
          fontSize={fontSize}
          wpm={wpm}
          rampSeconds={rampSeconds}
          onFontSizeChange={onFontSizeChange}
          onWpmChange={onWpmChange}
          onRampSecondsChange={onRampSecondsChange}
          library={library}
          isAuthenticated={status === "authenticated"}
        />

        <main className="flex h-full w-full max-w-5xl flex-1 flex-col items-center justify-between gap-4">
          <div className="flex w-full items-center justify-center">
            <div className="flex w-[95vw] max-w-6xl flex-col items-center gap-6 px-4 md:px-8">
              <div className="w-full">
                <div className="relative h-[clamp(18rem,50vh,34rem)]">
                  <div
                    className={cn(
                      "absolute inset-0 transition-all duration-500 ease-out",
                      isPlaying
                        ? "pointer-events-none translate-y-4 scale-[0.98] opacity-0"
                        : "translate-y-0 scale-100 opacity-100",
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
                    className={cn(
                      "absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out",
                      isPlaying
                        ? "translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none -translate-y-4 scale-[1.01] opacity-0",
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {displayedPastWords.length > 0 ? (
                        displayedPastWords.map((word, idx) => (
                          <span
                            key={`past-${idx}-${wordIndex}`}
                            className="whitespace-nowrap text-center text-muted-foreground opacity-70"
                            style={{
                              fontSize: `${Math.max(fontSize * 0.55, 14)}px`,
                              lineHeight: 1.4,
                            }}
                          >
                            {word}
                          </span>
                        ))
                      ) : (
                        <span className="h-[1.2em] select-none text-transparent" aria-hidden="true">
                          .
                        </span>
                      )}
                      <span
                        key={wordIndex}
                        className="focus-word whitespace-nowrap font-semibold tracking-tight"
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
                      >
                        {currentWord}
                      </span>
                      {displayedFutureWords.length > 0 ? (
                        displayedFutureWords.map((word, idx) => (
                          <span
                            key={`future-${idx}-${wordIndex}`}
                            className="whitespace-nowrap text-center text-muted-foreground opacity-70"
                            style={{
                              fontSize: `${Math.max(fontSize * 0.55, 14)}px`,
                              lineHeight: 1.4,
                            }}
                          >
                            {word}
                          </span>
                        ))
                      ) : (
                        <span className="h-[1.2em] select-none text-transparent" aria-hidden="true">
                          .
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <Button
                size="icon"
                variant="secondary"
                className="h-12 w-12 rounded-full shadow-sm"
                onClick={() => setIsPlaying((prev) => !prev)}
                aria-label={isPlaying ? "Pause" : "Start"}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <div className="w-[75vw] max-w-4xl shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:px-8 md:pb-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {currentPage}</span>
                <span>{Math.round(pageProgressValue)}%</span>
              </div>
              <Slider
                value={[pageProgressValue]}
                max={100}
                step={1}
                onValueChange={(values) => {
                  const next = values[0] ?? pageProgressValue;
                  seekWithinPage(next);
                }}
                onValueCommit={() => {
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
