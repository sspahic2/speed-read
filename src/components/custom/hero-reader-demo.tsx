"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/lib/utils";
import { ReaderPageProgress } from "@/components/custom/reader-page-progress";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { OrpWordDisplay } from "@/components/custom/orp-word-display";
import type { LibraryBlock } from "@/services/frontend-services/library-service";

const DEMO_TEXT = `The walls weren't moving, and the room was open, gaping. No colors, but shades of darkness, of night. Only those star-flecked violet eyes were bright, full of color and light. I was so tired, so broken and empty and aching that I couldn't look away. He smiled at me, and it was the most beautiful thing I had ever seen. Be glad of your human heart, he said softly. Pity those who don't feel anything at all. I had become the music and the fire and the night, and there was nothing that could slow me down.`;

const DEMO_BLOCKS: LibraryBlock[] = DEMO_TEXT.split(/(?<=\.)\s+/).map((sentence, i) => ({
  id: `hero-${i}`,
  text: sentence.trim(),
  type: "paragraph",
  page: 1,
}));

const ALL_WORDS = DEMO_TEXT.split(/\s+/);
const TOTAL_WORDS = ALL_WORDS.length;
const WORD_COUNTS = DEMO_BLOCKS.map((b) => (b.text ?? "").split(/\s+/).filter(Boolean).length);

type Phase = "blank" | "controls" | "text" | "playing" | "paused" | "done";

export function HeroReaderDemo() {
  const [phase, setPhase] = useState<Phase>("blank");
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [wordOffset, setWordOffset] = useState(0);
  const [mode, setMode] = useState<"flash" | "scroll">("scroll");
  const tickRef = useRef<number | null>(null);
  const blockRef = useRef(0);
  const offsetRef = useRef(0);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const isMobile = useIsMobile();

  // Phase sequence: blank → controls → text → playing
  useEffect(() => {
    const steps: [Phase, number][] = [
      ["controls", 600],
      ["text", 1200],
      ["playing", 1200],
    ];
    let i = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const next = () => {
      if (i >= steps.length) return;
      const [nextPhase, delay] = steps[i];
      timeout = setTimeout(() => {
        setPhase(nextPhase);
        i++;
        next();
      }, delay);
    };

    next();
    return () => clearTimeout(timeout);
  }, []);

  // Compute the current word globally for flash mode
  let globalWordIndex = 0;
  for (let i = 0; i < activeBlockIndex; i++) globalWordIndex += WORD_COUNTS[i];
  globalWordIndex += wordOffset;
  const currentWord = ALL_WORDS[globalWordIndex] ?? "";
  const pastWord = globalWordIndex > 0 ? ALL_WORDS[globalWordIndex - 1] : "";
  const futureWord = globalWordIndex < ALL_WORDS.length - 1 ? ALL_WORDS[globalWordIndex + 1] : "";

  // Auto-play tick
  useEffect(() => {
    if (phase !== "playing") return;

    const WPM = 200;
    const interval = Math.round(60000 / WPM);

    const tick = () => {
      const blk = blockRef.current;
      const off = offsetRef.current;
      const count = WORD_COUNTS[blk] ?? 1;

      if (off + 1 < count) {
        offsetRef.current = off + 1;
        setWordOffset(off + 1);
      } else if (blk + 1 < DEMO_BLOCKS.length) {
        blockRef.current = blk + 1;
        offsetRef.current = 0;
        setActiveBlockIndex(blk + 1);
        setWordOffset(0);
      } else {
        // Reached the end — stop
        setPhase("done");
        return;
      }

      tickRef.current = window.setTimeout(tick, interval);
    };

    tickRef.current = window.setTimeout(tick, interval);
    return () => {
      if (tickRef.current) window.clearTimeout(tickRef.current);
    };
  }, [phase]);

  const progress = Math.round((globalWordIndex / Math.max(TOTAL_WORDS - 1, 1)) * 100);
  const activeBlockId = DEMO_BLOCKS[activeBlockIndex]?.id ?? "";
  const showControls = phase !== "blank";
  const showText = phase === "text" || phase === "playing" || phase === "paused" || phase === "done";
  const isPlaying = phase === "playing";
  const isScrollMode = mode === "scroll";

  const handlePlayToggle = () => {
    if (phase === "playing") {
      setPhase("paused");
      if (tickRef.current) window.clearTimeout(tickRef.current);
    } else if (phase === "paused" || phase === "text" || phase === "controls" || phase === "done") {
      // If done, restart from beginning
      if (phase === "done") {
        blockRef.current = 0;
        offsetRef.current = 0;
        setActiveBlockIndex(0);
        setWordOffset(0);
      }
      setPhase("playing");
    }
  };

  const handleModeChange = (m: "flash" | "scroll") => {
    setMode(m);
    if (phase === "playing") {
      // Restart playback in new mode
      if (tickRef.current) window.clearTimeout(tickRef.current);
      setPhase("paused");
      setTimeout(() => setPhase("playing"), 50);
    }
  };

  return (
    <div className="relative w-[95vw] max-w-6xl overflow-hidden">
      {/* Reader area */}
      <div
        className={cn(
          "relative h-[280px] transition-opacity duration-700 sm:h-[340px]",
          showText ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Page progress — always rendered, visible when not in flash playback */}
        <div className={cn(
          "absolute inset-0 transition-all duration-500",
          isPlaying && !isScrollMode
            ? "pointer-events-none scale-[0.98] opacity-0"
            : "scale-100 opacity-100",
        )}>
          <ReaderPageProgress
            page={1}
            blocks={DEMO_BLOCKS}
            activeBlockId={activeBlockId}
            activeWordOffset={wordOffset}
            className="h-full"
            anchorBottom={isPlaying && isScrollMode}
            scrollMode={(isPlaying && isScrollMode) || undefined}
            hideGradients
            focusTrigger={focusTrigger}
          />
        </div>

        {/* Flash ORP overlay — only during flash playback */}
        {isPlaying && !isScrollMode && (
          <div className="absolute inset-0 flex items-center justify-center pt-[4vh]">
            <OrpWordDisplay
              word={currentWord}
              pastWord={pastWord}
              futureWord={futureWord}
              fontSize={isMobile ? 32 : 28}
              contextFontSize={isMobile ? 16 : 18}
              vertical={isMobile}
            />
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div
        className={cn(
          "px-5 py-3 transition-all duration-500",
          showControls ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <div className="flex flex-col items-center gap-2.5">
          {/* Play button */}
          <Button
            size="icon"
            variant="secondary"
            className={cn(
              "h-10 w-10 rounded-full shadow-sm",
              isPlaying && "animate-pulse ring-2 ring-highlight/40",
            )}
            onClick={handlePlayToggle}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          {/* Mode switcher */}
          <div className="flex items-center rounded-full border border-border/50 bg-card/40 p-0.5">
            <button
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                mode === "flash"
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
                mode === "scroll"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => handleModeChange("scroll")}
            >
              Scroll
            </button>
          </div>

          {/* Progress */}
          <div className="w-[60%] max-w-[240px] space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Page 1</span>
              <span>{progress}%</span>
            </div>
            <Slider
              value={[progress]}
              max={100}
              step={1}
              disabled={isPlaying}
              onValueChange={(values) => {
                if (isPlaying) return;
                const pct = values[0] ?? 0;
                const targetWord = Math.round((pct / 100) * Math.max(TOTAL_WORDS - 1, 0));
                let remaining = targetWord;
                let blk = 0;
                for (let i = 0; i < WORD_COUNTS.length; i++) {
                  if (remaining < WORD_COUNTS[i]) { blk = i; break; }
                  remaining -= WORD_COUNTS[i];
                  blk = i;
                }
                blockRef.current = blk;
                offsetRef.current = remaining;
                setActiveBlockIndex(blk);
                setWordOffset(remaining);
                setTimeout(() => setFocusTrigger((n) => n + 1), 100);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
