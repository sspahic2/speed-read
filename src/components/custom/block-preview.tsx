"use client";

import { memo, useState, useCallback } from "react";
import { cn } from "@/components/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

type BlockData = {
  id: string;
  text: string;
  type: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
};

type BlockPreviewProps = {
  block: BlockData;
  ignoredRef: React.MutableRefObject<Map<string, boolean>>;
  onSetIgnored: (id: string, ignored: boolean) => void;
  refreshTrigger: number;
};

function BlockPreviewComponent({ block, ignoredRef, onSetIgnored, refreshTrigger }: BlockPreviewProps) {
  // Track pending state for instant feedback
  const [pendingIgnored, setPendingIgnored] = useState<boolean | null>(null);
  
  // Get current ignored state - prefer pending, then ref
  const getIgnored = useCallback(() => {
    if (pendingIgnored !== null) return pendingIgnored;
    return ignoredRef.current.get(block.id) ?? false;
  }, [pendingIgnored, block.id, ignoredRef, refreshTrigger]);

  const currentIgnored = getIgnored();
  
  const paragraphClass =
    block.type === "heading"
      ? "text-center font-semibold uppercase tracking-[0.3em] text-foreground/90 break-words [overflow-wrap:anywhere]"
      : block.type === "special_paragraph"
        ? "italic text-foreground/80 break-words [overflow-wrap:anywhere]"
        : "text-foreground/90 text-justify break-words [overflow-wrap:anywhere]";

  const handleIgnore = () => {
    setPendingIgnored(true);
    onSetIgnored(block.id, true);
    // Clear pending after a short delay so we sync with ref
    setTimeout(() => setPendingIgnored(null), 50);
  };

  const handleInclude = () => {
    setPendingIgnored(false);
    onSetIgnored(block.id, false);
    // Clear pending after a short delay so we sync with ref
    setTimeout(() => setPendingIgnored(null), 50);
  };

  return (
    <div className="space-y-2">
      <p
        id={block.id}
        className={paragraphClass}
        style={{
          fontSize: `${block.fontSize * 1.5}px`,
          lineHeight: `${block.lineHeight * 1.5}px`,
          fontWeight: block.fontWeight,
        }}
      >
        {block.text}
      </p>
      <div className="flex items-center justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={handleIgnore}
          className={cn(
            "inline-flex h-7 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors border bg-transparent focus-visible:bg-transparent active:bg-transparent",
            currentIgnored
              ? "border-destructive bg-destructive text-destructive-foreground"
              : "border-destructive/60 text-muted-foreground hover:border-destructive hover:text-destructive hover:bg-transparent",
          )}
        >
          <XCircle className="h-4 w-4" aria-hidden />
          <span className="sr-only">Ignore block</span>
        </button>
        <button
          type="button"
          onClick={handleInclude}
          className={cn(
            "inline-flex h-7 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors border bg-transparent focus-visible:bg-transparent active:bg-transparent",
            !currentIgnored
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary/60 text-muted-foreground hover:border-primary hover:text-primary hover:bg-transparent",
          )}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          <span className="sr-only">Include block</span>
        </button>
      </div>
    </div>
  );
}

const BlockPreview = memo(BlockPreviewComponent);
export default BlockPreview;
