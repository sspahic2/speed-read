"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { ArrowRight, BookOpen, Gauge, Library, Sparkles, Type, Upload, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/custom/scroll-reveal";

const WORDS = ["faster", "smarter", "deeper", "calmer"];

function WordCycler() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block overflow-hidden align-bottom">
      {WORDS.map((word, i) => (
        <span
          key={word}
          className={`inline-block transition-all duration-500 ${
            i === index
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 absolute inset-0"
          }`}
          style={{ color: "hsl(var(--highlight))" }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

function FloatingShapes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Top-right circle */}
      <div className="animate-float absolute -right-8 -top-8 size-48 rounded-full bg-primary/[0.04] blur-2xl sm:-right-12 sm:-top-12 sm:size-72" />
      {/* Left blob */}
      <div className="animate-float-slow absolute -left-12 top-1/3 size-40 rounded-full bg-highlight/[0.03] blur-3xl sm:-left-16 sm:size-64" />
      {/* Bottom ring */}
      <div className="animate-pulse-ring absolute -bottom-6 right-1/4 size-32 rounded-full border border-primary/[0.08] sm:size-48" />
      {/* Small accent dot */}
      <div className="animate-float absolute right-1/3 top-1/4 size-3 rounded-full bg-highlight/20 sm:size-4" />
      <div className="animate-float-slow absolute left-1/4 bottom-1/3 size-2 rounded-full bg-primary/20 sm:size-3" />
    </div>
  );
}

function StepCard(props: { step: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-5 py-6 text-center backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-card/80 sm:gap-4 sm:px-6 sm:py-8">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground/60 sm:text-xs">
        {props.step}
      </span>
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110 sm:size-14 sm:rounded-2xl">
        {props.icon}
      </div>
      <h3 className="text-sm font-semibold sm:text-base">{props.title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{props.description}</p>
    </div>
  );
}

function FeatureRow(props: { icon: React.ReactNode; title: string; description: string; delay: number }) {
  return (
    <ScrollReveal delay={props.delay}>
      <div className="flex gap-4 rounded-2xl border border-border/40 bg-card/40 px-5 py-5 backdrop-blur-sm transition-colors hover:border-primary/20 hover:bg-card/60 sm:gap-5 sm:px-6 sm:py-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-12 sm:rounded-2xl">
          {props.icon}
        </div>
        <div className="space-y-1 sm:space-y-1.5">
          <h3 className="text-sm font-semibold sm:text-base">{props.title}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{props.description}</p>
        </div>
      </div>
    </ScrollReveal>
  );
}

function StatBlock(props: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{props.value}</span>
      <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">{props.label}</span>
    </div>
  );
}

export function HomePageClient() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_50%)]">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <FloatingShapes />

        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 pb-16 pt-12 text-center sm:gap-8 sm:px-6 sm:pb-24 sm:pt-20 md:pt-28">
          {/* Pill */}
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-primary sm:text-xs">
                Speed reading reimagined
              </span>
            </div>
          </ScrollReveal>

          {/* Headline */}
          <ScrollReveal delay={100}>
            <h1 className="max-w-lg text-3xl font-bold leading-[1.15] tracking-tight sm:max-w-2xl sm:text-5xl md:text-6xl">
              Read <WordCycler /> with<br className="hidden sm:inline" /> zero distractions
            </h1>
          </ScrollReveal>

          {/* Subheadline */}
          <ScrollReveal delay={200}>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:max-w-lg sm:text-base md:text-lg">
              Upload your books, set your pace, and let RSVP technology
              do the rest. One word at a time, at the speed you choose.
            </p>
          </ScrollReveal>

          {/* CTAs */}
          <ScrollReveal delay={300}>
            <div className="flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Button size="lg" className="rounded-full px-7 text-sm sm:px-8" asChild>
                  <Link href="/library">
                    Get started
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="rounded-full px-7 text-sm sm:px-8"
                  onClick={() => signIn("google", { callbackUrl: "/library" })}
                >
                  Get started free
                  <ArrowRight className="size-4" />
                </Button>
              )}
              <Button size="lg" variant="outline" className="rounded-full px-7 text-sm sm:px-8" asChild>
                <Link href="/pricing">See pricing</Link>
              </Button>
              <Button size="lg" variant="ghost" className="rounded-full px-7 text-sm sm:px-8" asChild>
                <Link href="/reader">
                  <Type className="size-4" />
                  Practice a speech
                </Link>
              </Button>
            </div>
          </ScrollReveal>

          {/* Decorative divider */}
          <div className="mt-4 h-px w-2/3 max-w-xs bg-gradient-to-r from-transparent via-border to-transparent sm:mt-8" />
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        <ScrollReveal>
          <div className="mb-8 text-center sm:mb-12">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:text-xs">
              How it works
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight sm:mt-3 sm:text-3xl">
              Three steps to faster reading
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          <ScrollReveal delay={0}>
            <StepCard
              step="01"
              icon={<Upload className="size-5 sm:size-6" />}
              title="Upload"
              description="Drop a PDF or EPUB into your library. We extract the text blocks instantly."
            />
          </ScrollReveal>
          <ScrollReveal delay={120}>
            <StepCard
              step="02"
              icon={<Gauge className="size-5 sm:size-6" />}
              title="Set your pace"
              description="Choose your words per minute. Start slow and ramp up as you build focus."
            />
          </ScrollReveal>
          <ScrollReveal delay={240}>
            <StepCard
              step="03"
              icon={<Zap className="size-5 sm:size-6" />}
              title="Read"
              description="Words appear one at a time at your rhythm. No scrolling, no scanning, just flow."
            />
          </ScrollReveal>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative overflow-hidden py-12 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
        <ScrollReveal>
          <div className="relative mx-auto grid max-w-3xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:gap-6 sm:px-6">
            <StatBlock value="3x" label="Reading speed" />
            <StatBlock value="320+" label="Words / min" />
            <StatBlock value="PDF" label="& EPUB support" />
            <StatBlock value="100%" label="Privacy first" />
          </div>
        </ScrollReveal>
      </section>

      {/* ── Features ── */}
      <section className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        <ScrollReveal>
          <div className="mb-8 text-center sm:mb-12">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:text-xs">
              Features
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight sm:mt-3 sm:text-3xl">
              Everything you need to read better
            </h2>
          </div>
        </ScrollReveal>

        <div className="mx-auto grid max-w-2xl gap-4 sm:gap-5">
          <FeatureRow
            icon={<BookOpen className="size-5 sm:size-6" />}
            title="RSVP speed reading"
            description="Rapid Serial Visual Presentation shows one word at a time, eliminating saccadic eye movements and dramatically increasing reading speed."
            delay={0}
          />
          <FeatureRow
            icon={<Library className="size-5 sm:size-6" />}
            title="Personal library"
            description="Upload PDFs and EPUBs to your cloud library. Toggle text blocks, pick up where you left off, and manage everything from one place."
            delay={100}
          />
          <FeatureRow
            icon={<Gauge className="size-5 sm:size-6" />}
            title="Adjustable pacing"
            description="Fine-tune your words per minute, font size, and warmup countdown. The reader adapts to your comfort level as you improve."
            delay={200}
          />
          <FeatureRow
            icon={<Zap className="size-5 sm:size-6" />}
            title="Keyboard & touch controls"
            description="Space to play/pause, arrows to scrub. On mobile, tap to control. Everything is designed for minimal friction."
            delay={300}
          />
          <FeatureRow
            icon={<Type className="size-5 sm:size-6" />}
            title="Speech practice — free"
            description="Paste any text and practice delivering it at your own pace. No account required. Perfect for presentations, speeches, and rehearsals."
            delay={400}
          />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pb-24 sm:pt-8">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 px-6 py-12 text-center backdrop-blur-sm sm:rounded-3xl sm:px-10 sm:py-16">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-highlight/[0.03]" />
            <div className="animate-float-slow absolute -right-10 -top-10 size-40 rounded-full border border-primary/[0.06] sm:size-56" />
            <div className="animate-float absolute -bottom-8 -left-8 size-32 rounded-full bg-highlight/[0.03] blur-2xl sm:size-44" />

            <div className="relative space-y-5 sm:space-y-6">
              <h2 className="text-xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                Ready to read at your true speed?
              </h2>
              <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm md:text-base">
                Join readers who are finishing books faster while retaining more.
                Start with a free trial — no credit card required.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                {isAuthenticated ? (
                  <Button size="lg" className="rounded-full px-7 text-sm sm:px-8" asChild>
                    <Link href="/library">
                      Go to library
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="rounded-full px-7 text-sm sm:px-8"
                    onClick={() => signIn("google", { callbackUrl: "/library" })}
                  >
                    Start free trial
                    <ArrowRight className="size-4" />
                  </Button>
                )}
                <Button size="lg" variant="outline" className="rounded-full px-7 text-sm sm:px-8" asChild>
                  <Link href="/pricing">View plans</Link>
                </Button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-sm">
          <p>&copy; 2026 Speed Reader</p>
          <Link
            className="underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground"
            href="/terms-and-conditions"
          >
            Terms & Conditions
          </Link>
        </div>
      </footer>
    </main>
  );
}
