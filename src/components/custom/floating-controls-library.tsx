"use client";

import { useEffect, useMemo, useState } from "react";
import { FloatingControls } from "@/components/custom/floating-controls";
import type { FloatingControlsSide } from "@/components/hooks/use-floating-controls";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/components/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

type TocItem = {
  id: string;
  text: string;
  page: number;
  ignored: boolean;
};

type FloatingControlsLibraryProps = {
  items: TocItem[];
  side: FloatingControlsSide;
  visible: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onBulkUpdate: (ids: string[], ignored: boolean) => void;
};

export function FloatingControlsLibrary({
  items,
  side,
  visible,
  onToggle,
  onSelect,
  onBulkUpdate,
}: FloatingControlsLibraryProps) {
  const [filter, setFilter] = useState<"all" | "included" | "ignored">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (filter === "included") return items.filter((i) => !i.ignored);
    if (filter === "ignored") return items.filter((i) => i.ignored);
    return items;
  }, [items, filter]);

  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (ids.has(id)) next.add(id);
      });
      return next;
    });
  }, [items]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((item) => item.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());
  const hasSelection = selectedIds.size > 0;

  return (
    <FloatingControls visible={visible} side={side} onToggle={onToggle}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span>Maybe read</span>
        <Tooltip>
          <TooltipTrigger className="h-4 w-4 rounded-full border border-border/60 text-[10px] font-bold leading-4">
            ?
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] text-xs">
            We are unsure you want these sections in the reader. Tap to jump and decide.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        {(["all", "included", "ignored"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              filter === key
                ? "bg-muted text-foreground"
                : "bg-transparent text-muted-foreground hover:bg-muted/60",
            )}
          >
            {key === "all" ? "All" : key === "included" ? "Included" : "Ignored"}
          </button>
        ))}
      </div>

      {hasSelection && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-2 text-[11px]">
          <span className="font-semibold text-foreground">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={() => {
              onBulkUpdate(Array.from(selectedIds), true);
              clearSelection();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-destructive/60 px-2 py-1 text-[11px] font-semibold text-destructive transition hover:border-destructive"
          >
            <XCircle className="h-3.5 w-3.5" />
            Ignore
          </button>
          <button
            type="button"
            onClick={() => {
              onBulkUpdate(Array.from(selectedIds), false);
              clearSelection();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-400/70 px-2 py-1 text-[11px] font-semibold text-emerald-400 transition hover:border-emerald-300"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Include
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={selectAllFiltered}
            className="rounded-md px-2 py-1 transition hover:bg-muted/70 disabled:opacity-40"
            disabled={filtered.length === 0}
          >
            Select all
          </button>
          <span>{filtered.length} items</span>
        </div>
        {filtered.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/50 bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
            No sections detected.
          </p>
        ) : (
          filtered.map((item) => {
            const selected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(item.id);
                  }
                }}
                className="group relative flex w-full cursor-pointer items-start gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2 text-left text-xs text-foreground/90 transition hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => {
                    toggleSelect(item.id);
                  }}
                  className="mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="block text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      Page {item.page}
                    </span>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        item.ignored ? "bg-destructive" : "bg-emerald-400",
                      )}
                      aria-hidden
                    />
                    <span className="text-[11px] text-muted-foreground">
                      {item.ignored ? "Ignored" : "Included"}
                    </span>
                  </div>
                  <span className="line-clamp-2">{item.text}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </FloatingControls>
  );
}
