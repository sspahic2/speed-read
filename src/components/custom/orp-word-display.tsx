"use client";

import { splitWordAtPivot } from "@/lib/reader-utils";

type OrpWordDisplayProps = {
  word: string;
  pastWord?: string;
  futureWord?: string;
  fontSize: number;
  contextFontSize: number;
  vertical?: boolean;
};

export function OrpWordDisplay({
  word,
  pastWord,
  futureWord,
  fontSize,
  contextFontSize,
  vertical = false,
}: OrpWordDisplayProps) {
  const { prefix, pivot, suffix } = splitWordAtPivot(word);

  return (
    <div className="relative w-full max-w-4xl">
      <div className="absolute left-1/2 -top-3 h-2 w-px -translate-x-1/2 bg-muted-foreground/20" />
      <div className="absolute left-1/2 -bottom-3 h-2 w-px -translate-x-1/2 bg-muted-foreground/20" />
      {vertical ? (
        /* ── Vertical stack (mobile) ── */
        <div className="flex w-full flex-col items-center gap-2">
          <span
            className="min-h-[1.2em] text-center text-muted-foreground/60"
            style={{ fontSize: `${contextFontSize}px`, lineHeight: 1.4 }}
          >
            {pastWord ?? "\u00A0"}
          </span>
          <div className="flex w-full items-baseline justify-center whitespace-nowrap">
            {/* Invisible suffix spacer on the left — balances the visible suffix so the pivot stays centered */}
            <span
              className="invisible font-semibold"
              aria-hidden="true"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
            >{suffix}</span>
            <span
              className="font-semibold tracking-normal focus-word"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
            >{prefix}</span><span
              className="font-semibold tracking-normal text-highlight focus-word"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
            >{pivot || "\u00A0"}</span><span
              className="font-semibold tracking-normal focus-word"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
            >{suffix}</span>
            {/* Invisible prefix spacer on the right — balances the visible prefix */}
            <span
              className="invisible font-semibold"
              aria-hidden="true"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
            >{prefix}</span>
          </div>
          <span
            className="min-h-[1.2em] text-center text-muted-foreground/60"
            style={{ fontSize: `${contextFontSize}px`, lineHeight: 1.4 }}
          >
            {futureWord ?? "\u00A0"}
          </span>
        </div>
      ) : (
        /* ── Horizontal (desktop) ── */
        <div
          className="grid w-full items-baseline"
          style={{ gridTemplateColumns: "1fr auto 1fr" }}
        >
          <div className="flex items-baseline justify-end gap-4 overflow-hidden">
            {pastWord && (
              <span
                className="whitespace-nowrap text-muted-foreground/60"
                style={{ fontSize: `${contextFontSize}px`, lineHeight: 1.4 }}
              >
                {pastWord}
              </span>
            )}
            <span
              className="whitespace-nowrap font-semibold tracking-normal focus-word"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
            >
              {prefix}
            </span>
          </div>
          <span
            className="font-semibold tracking-normal text-highlight focus-word"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
          >
            {pivot || "\u00A0"}
          </span>
          <div className="flex items-baseline justify-start gap-4 overflow-hidden">
            <span
              className="whitespace-nowrap font-semibold tracking-normal focus-word"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
            >
              {suffix}
            </span>
            {futureWord && (
              <span
                className="whitespace-nowrap text-muted-foreground/60"
                style={{ fontSize: `${contextFontSize}px`, lineHeight: 1.4 }}
              >
                {futureWord}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
