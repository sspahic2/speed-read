import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="bg-linear-to-b from-background via-background/70 to-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="rounded-2xl border border-border/70 bg-card/80 px-6 py-10 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <Badge variant="outline" className="rounded-md px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Speed reader
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight">Fast focus, calmer reading.</h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Paste text or upload books, then pace the words at a rhythm that matches your brain.
                We’ll keep controls simple and the visuals quiet so you can stay locked in.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/library">Go to Library</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/library">Upload a document</Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/70 p-4 text-sm">
              <span className="text-muted-foreground uppercase tracking-[0.18em] text-xs">
                Quick stats
              </span>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Target speed" value="320 wpm" />
                <Stat label="Focus block" value="6s warmup" />
                <Stat label="Modes" value="Reader · Library" />
                <Stat label="Controls" value="Space · Arrows" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>Reader</CardTitle>
              <CardDescription>
                Single-word pacing with adjustable speed, font size, and quick restart.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <Feature text="Countdown warmup before pacing starts." />
              <Feature text="Scrub through words with the progress slider." />
              <Feature text="Keyboard shortcuts for start/stop." />
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/reader">Open reader</Link>
            </Button>
          </CardFooter>
        </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>Library</CardTitle>
              <CardDescription>
                Upload PDFs or EPUBs, toggle which blocks are included, and send to the reader.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <Feature text="File upload with parse feedback." />
              <Feature text="Mark headings or special blocks as ignored by default." />
              <Feature text="Reset visibility to default rules with one tap." />
            </CardContent>
            <CardFooter>
              <Button variant="secondary" asChild>
                <Link href="/library">Manage library</Link>
              </Button>
            </CardFooter>
          </Card>
        </section>

        <footer className="mt-2 border-t border-border/70 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>&copy; 2026 Speed Reader</p>
            <Link className="underline decoration-muted-foreground/50 underline-offset-4" href="/terms-and-conditions">
              Terms & Conditions
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
      <p>{text}</p>
    </div>
  );
}
