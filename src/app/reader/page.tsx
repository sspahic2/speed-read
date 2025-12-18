"use client";

import { useEffect, useState } from "react";
import { FloatingControlsReader } from "@/components/custom/floating-controls-reader";
import { ReaderDrawer } from "@/components/custom/reader-drawer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Pause, Play } from "lucide-react";
import { useReaderState } from "@/components/hooks/use-reader-state";
import { useSession } from "next-auth/react";

export default function ReaderPage() {
  const { status } = useSession();
  const {
    fontSize,
    setFontSize,
    wpm,
    setWpm,
    wordIndex,
    setWordIndex,
    isPlaying,
    setIsPlaying,
    rampSeconds,
    setRampSeconds,
    currentWord,
    displayedPastWords,
    displayedFutureWords,
    wordsLength,
    progressValue,
    pageProgressValue,
    currentPage,
    floatingControls,
    library,
    seekToPercent,
    seekWithinPage,
    endSeek,
    onFontSizeChange,
    onWpmChange,
    onRampSecondsChange,
  } = useReaderState();

  const [pageFade, setPageFade] = useState(true);
  useEffect(() => {
    setPageFade(false);
    const t = setTimeout(() => setPageFade(true), 10);
    return () => clearTimeout(t);
  }, [currentPage]);

  return (
    <div className="relative bg-background text-foreground">
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
      <div className="relative mx-auto flex w-full min-h-[calc(100vh-80px)] flex-col items-center gap-6 px-6 py-8">
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

        <main className="flex h-full flex-1 flex-col items-center justify-center gap-6">
          <div className="flex w-full items-center justify-center">
            <div className="flex w-[75vw] max-w-4xl flex-col items-center gap-6 px-4 md:px-8">
              <div className="mt-4 flex min-h-[220px] items-center justify-center">
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
          <div className="w-[75vw] max-w-4xl shrink-0 px-4 md:px-8">
            <div
              key={currentPage}
              className={`space-y-2 transition-opacity duration-300 ${pageFade ? "opacity-100" : "opacity-0"}`}
            >
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
