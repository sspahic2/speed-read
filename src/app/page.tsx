"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const defaultText = `Speed reading lets you consume text at pace without losing comprehension. Keep your gaze relaxed, focus on the center of each word, and trust your brain to stitch the story together. Breathe slowly, keep your shoulders loose, and let the rhythm carry you.`;

export default function Home() {
  const [text, setText] = useState(defaultText);
  const [wpm, setWpm] = useState(320);
  const [isRunning, setIsRunning] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [fontSize, setFontSize] = useState(64);
  const [isFocusTransition, setIsFocusTransition] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const words = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean),
    [text],
  );

  useEffect(() => {
    setIsRunning(false);
    setWordIndex(0);
    setCountdown(null);
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
  }, [text]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && fontSize > 56) {
      setFontSize(56);
    }
  }, [isMobile, fontSize]);

  useEffect(() => {
    if (!isRunning || words.length === 0) return;

    const safeWpm = Math.max(wpm, 1);
    const rampBase = 200;
    const progressRatio =
      words.length > 1 ? wordIndex / Math.max(words.length - 1, 1) : 1;
    const rampFactor =
      safeWpm <= rampBase
        ? 1
        : 1 - Math.exp(-Math.max(progressRatio, 0) * 3); // smooth ease to target
    const rampedWpm =
      safeWpm <= rampBase
        ? safeWpm
        : rampBase + (safeWpm - rampBase) * rampFactor;
    const delay = Math.max(60000 / rampedWpm, 25);
    const timer = setTimeout(() => {
      setWordIndex((idx) => {
        const next = idx + 1;
        if (next >= words.length) {
          setIsRunning(false);
          return words.length - 1;
        }
        return next;
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [isRunning, words.length, wpm, wordIndex]);

  const startReading = () => {
    if (words.length === 0) return;
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
    setIsSidebarOpen(false);
    setWordIndex((idx) => (idx >= words.length - 1 ? 0 : idx));
    setIsRunning(false);
    setIsFocusTransition(true);
    setCountdown(6);
    focusTimerRef.current = setTimeout(() => {
      setIsRunning(true);
      setIsFocusTransition(false);
      setCountdown(null);
    }, 6000);
  };

  const stopReading = () => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
    setCountdown(null);
    setIsFocusTransition(false);
    setIsRunning(false);
  };

  const toggleReading = () => {
    if (isRunning || isFocusTransition) {
      stopReading();
    } else {
      startReading();
    }
  };

  const mobileFontMax = 56;
  const progress = words.length
    ? (wordIndex / Math.max(words.length - 1, 1)) * 100
    : 0;
  const previewCount = isMobile ? 2 : 5;
  const displayFontSize = isMobile ? Math.min(fontSize, mobileFontMax) : fontSize;
  const currentWord = words[wordIndex] ?? "Ready?";
  const previousWords = useMemo(
    () => words.slice(Math.max(0, wordIndex - previewCount), wordIndex),
    [words, wordIndex, previewCount],
  );
  const nextWords = useMemo(
    () => words.slice(wordIndex + 1, wordIndex + 1 + previewCount),
    [words, wordIndex, previewCount],
  );

  const seekToClientX = (clientX: number) => {
    if (!progressRef.current || words.length === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const target = Math.round(ratio * (words.length - 1));
    setWordIndex(target);
  };

  useEffect(() => {
    if (!isSeeking) return;

    const handleMouseMove = (event: MouseEvent) => {
      seekToClientX(event.clientX);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const clientX = event.touches[0]?.clientX;
      if (typeof clientX === "number") {
        seekToClientX(clientX);
      }
    };

    const handleUp = () => setIsSeeking(false);

    const touchOpts: AddEventListenerOptions = { passive: true };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, touchOpts);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove, touchOpts);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isSeeking, words.length]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => (prev !== null ? Math.max(prev - 1, 0) : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        target?.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT";
      if (isEditable) return;
      event.preventDefault();
      if (isRunning || isFocusTransition) {
        stopReading();
      } else if (words.length > 0) {
        startReading();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isRunning, isFocusTransition, words.length, startReading, stopReading]);

  const isFading = isRunning || isFocusTransition;
  const titleText = countdown !== null ? countdown.toString() : "Focus zone";
  const titleOpacity =
    countdown !== null ? Math.max(countdown / 6, 0) : isFading ? 0 : 1;
  const fontSliderMax = isMobile ? mobileFontMax : 140;
  const fontInputMax = isMobile ? mobileFontMax : 160;
  const sidebarMobileState = isSidebarOpen
    ? "translate-x-0 opacity-100"
    : "-translate-x-full opacity-0";
  const sidebarDesktopState = isFading
    ? "lg:-translate-x-full lg:opacity-0"
    : "lg:translate-x-0 lg:opacity-100";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <button
        onClick={() => setIsSidebarOpen((v) => !v)}
        className="fixed left-4 top-4 z-30 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80 text-zinc-100 shadow-lg transition hover:border-emerald-400/60 hover:text-emerald-200 lg:hidden"
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? (
          <span className="text-xl leading-none">×</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-6 w-6"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {isSidebarOpen && !isFading && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className="relative min-h-screen lg:grid lg:gap-8"
        style={{
          gridTemplateColumns: isFading ? "0px 1fr" : "360px 1fr",
          transition: "grid-template-columns 3000ms ease",
        }}
      >
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-full max-w-none border-r border-zinc-900/80 bg-zinc-950/95 px-6 py-8 backdrop-blur transition-all duration-[3000ms] ease-out lg:relative lg:w-full lg:max-w-[360px] ${
            isFading ? "pointer-events-none" : "pointer-events-auto"
          } ${sidebarMobileState} ${sidebarDesktopState}`}
        >
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <span className="text-sm font-semibold text-zinc-200">
              Controls
            </span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-200 transition hover:border-emerald-400/60"
              aria-label="Close sidebar"
            >
              ×
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Speed reader
              </p>
              <h1 className="text-xl font-semibold text-zinc-100">
                Pacing console
              </h1>
            </div>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              Dark
            </span>
          </div>

          <div className="mt-8 space-y-2">
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>Paste text</span>
              <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                Input
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Drop any text here..."
              className="min-h-[230px] w-full resize-none rounded-2xl border border-zinc-900 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 shadow-[0_15px_80px_rgba(0,0,0,0.35)] outline-none transition hover:border-zinc-800 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="mt-6 space-y-4 rounded-2xl border border-zinc-900 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span>Words per minute</span>
              <span className="font-semibold text-zinc-50">{wpm} wpm</span>
            </div>
            <input
              type="range"
              min={120}
              max={900}
              step={10}
              value={Math.max(wpm, 120)}
              onChange={(e) => setWpm(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={120}
                max={1200}
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value) || 0)}
                onBlur={() =>
                  setWpm((value) =>
                    Math.min(1200, Math.max(120, value || 120)),
                  )
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-400/70"
              />
              <button
                onClick={() => setText(defaultText)}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-400/60 hover:text-emerald-200"
              >
                Load sample
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4 rounded-2xl border border-zinc-900 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span>Font size</span>
              <span className="font-semibold text-zinc-50">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={32}
              max={fontSliderMax}
              step={2}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={24}
                max={fontInputMax}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value) || fontSize)}
                onBlur={() =>
                  setFontSize((value) =>
                    Math.min(fontInputMax, Math.max(24, value || 64)),
                  )
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-400/70"
              />
              <button
                onClick={() => setFontSize(isMobile ? mobileFontMax : 64)}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-400/60 hover:text-emerald-200"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <StatBox label="Words" value={words.length.toString()} />
            <StatBox
              label="Approx. duration"
              value={
                words.length === 0
                  ? "—"
                  : `${Math.max(
                      1,
                      Math.round((words.length / wpm) * 60),
                    )}s`
              }
            />
          </div>
        </aside>

        <section className="relative flex min-h-screen flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-[120px]" />
            <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-sky-500/10 blur-[140px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/60" />
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-12 text-center">
            <div className="w-full max-w-5xl space-y-8">
              <div className="relative overflow-visible px-8 py-16">
                <div
                  className={`absolute inset-0 rounded-3xl border border-zinc-900/70 bg-zinc-900/60 shadow-[0_30px_140px_rgba(0,0,0,0.45)] transition-all duration-[3000ms] ease-out ${
                    isFading
                      ? "opacity-0 scale-95 border-transparent shadow-none bg-transparent"
                      : "opacity-100 scale-100"
                  }`}
                />
                <div className="relative">
                  <p
                    className="text-sm uppercase tracking-[0.18em] text-emerald-200/70 transition-all duration-700"
                    style={{ opacity: titleOpacity }}
                  >
                    {titleText}
                  </p>
                  <div className="mt-8 flex min-h-[220px] items-center justify-center">
                    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 overflow-hidden">
                      <div className="flex items-center justify-end gap-2 truncate whitespace-nowrap">
                        {previousWords.map((word, idx) => (
                          <span
                            key={`prev-${idx}-${wordIndex}`}
                            className="text-zinc-500"
                            style={{
                              fontSize: `${Math.max(displayFontSize * 0.45, 14)}px`,
                            }}
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-center">
                        <span
                          className="whitespace-nowrap font-semibold tracking-tight text-emerald-50"
                          style={{
                            fontSize: `${displayFontSize}px`,
                            lineHeight: 1.08,
                          }}
                        >
                          {currentWord}
                        </span>
                      </div>
                      <div className="flex items-center justify-start gap-2 truncate whitespace-nowrap">
                        {nextWords.map((word, idx) => (
                          <span
                            key={`next-${idx}-${wordIndex}`}
                          className="text-zinc-600"
                          style={{
                            fontSize: `${Math.max(displayFontSize * 0.45, 14)}px`,
                          }}
                        >
                          {word}
                        </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center justify-center gap-3 transition-all duration-[5000ms] ${
                  isFading ? "opacity-50 blur-[0.5px]" : "opacity-100"
                }`}
              >
                <button
                  aria-disabled={words.length === 0}
                  onClick={toggleReading}
                  className={`group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition hover:-translate-y-0.5 ${
                    isRunning || isFocusTransition
                      ? "border border-zinc-800 bg-zinc-900/80 text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800/90"
                      : "border border-emerald-500/70 bg-emerald-500/90 text-emerald-950 shadow-[0_10px_60px_rgba(16,185,129,0.35)] hover:bg-emerald-400"
                  } ${words.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isRunning || isFocusTransition ? <StopIcon /> : <PlayIcon />}
                  <span className="sr-only">
                    {isRunning || isFocusTransition ? "Stop" : "Start"}
                  </span>
                </button>
              </div>

              <div
                className={`mx-auto w-full max-w-3xl space-y-2 transition-all duration-[5000ms] ${
                  isFading ? "opacity-25 blur-[1px] pointer-events-none" : ""
                }`}
              >
                <div
                  ref={progressRef}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  tabIndex={0}
                  onMouseDown={(e) => {
                    seekToClientX(e.clientX);
                    setIsSeeking(true);
                  }}
                  onTouchStart={(e) => {
                    const clientX = e.touches[0]?.clientX;
                    if (typeof clientX === "number") {
                      seekToClientX(clientX);
                      setIsSeeking(true);
                    }
                  }}
                  className="group relative h-3 cursor-pointer rounded-full bg-zinc-900 transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                >
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="absolute -top-1.5 h-6 w-6 -translate-x-1/2 rounded-full border border-emerald-300/70 bg-emerald-200/80 shadow-[0_10px_40px_rgba(16,185,129,0.35)] transition group-hover:scale-105"
                    style={{ left: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {words.length === 0
                  ? "—"
                      : `Word ${wordIndex + 1} of ${words.length}`}
                  </span>
                  <span>{wpm} wpm</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-900/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
    >
      <path
        strokeLinejoin="round"
        d="M7 5.5v13a.5.5 0 0 0 .77.42l10.04-6.5a.5.5 0 0 0 0-.84L7.77 5.07A.5.5 0 0 0 7 5.5Z"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
    >
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  );
}




