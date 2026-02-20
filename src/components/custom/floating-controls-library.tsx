"use client";

import { memo, startTransition, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { FloatingControls } from "@/components/custom/floating-controls";
import { useIsMobile } from "@/components/hooks/use-mobile";
import type { FloatingControlsSide } from "@/components/hooks/use-floating-controls";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/components/lib/utils";
import { CheckCircle2, ChevronUp, XCircle } from "lucide-react";

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

type TocRowsProps = {
  filtered: TocItem[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
};

type TocRowProps = {
  item: TocItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  style?: CSSProperties;
};

const VIRTUALIZE_THRESHOLD = 100;
const VIRTUAL_ROW_HEIGHT = 92;
const VIRTUAL_ROW_GAP = 8;
const VIRTUAL_OVERSCAN = 8;

const TocRow = memo(function TocRow({
  item,
  selected,
  onSelect,
  onToggleSelect,
  style,
}: TocRowProps) {
  return (
    <div
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
      style={style}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => {
          onToggleSelect(item.id);
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
              item.ignored ? "bg-destructive" : "bg-primary",
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
});

const TocRows = memo(function TocRows({ filtered, selectedIds, onSelect, onToggleSelect }: TocRowsProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const shouldVirtualize = filtered.length >= VIRTUALIZE_THRESHOLD;

  const handleScrollRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    setViewportHeight(node.clientHeight);
    setScrollTop(node.scrollTop);
  }, []);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    setScrollTop(0);
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border/50 bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
        No sections detected.
      </p>
    );
  }

  if (!shouldVirtualize) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <TocRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              onSelect={onSelect}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      </div>
    );
  }

  const totalHeight = filtered.length * VIRTUAL_ROW_HEIGHT;
  const safeViewport = Math.max(viewportHeight, VIRTUAL_ROW_HEIGHT);
  const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN);
  const endIndex = Math.min(
    filtered.length,
    Math.ceil((scrollTop + safeViewport) / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN,
  );
  const visible = filtered.slice(startIndex, endIndex);

  return (
    <div
      ref={handleScrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto pr-1"
    >
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        {visible.map((item, idx) => {
          const absoluteIndex = startIndex + idx;
          return (
            <TocRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              onSelect={onSelect}
              onToggleSelect={onToggleSelect}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${absoluteIndex * VIRTUAL_ROW_HEIGHT}px`,
                height: `${VIRTUAL_ROW_HEIGHT - VIRTUAL_ROW_GAP}px`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
});

export function FloatingControlsLibrary({
  items,
  side,
  visible,
  onToggle,
  onSelect,
  onBulkUpdate,
}: FloatingControlsLibraryProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  const onFilterChange = useCallback((next: "all" | "included" | "ignored") => {
    startTransition(() => {
      setFilter(next);
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filtered.map((item) => item.id)));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const includeSelection = useCallback(() => {
    onBulkUpdate(Array.from(selectedIds), false);
    clearSelection();
  }, [clearSelection, onBulkUpdate, selectedIds]);

  const ignoreSelection = useCallback(() => {
    onBulkUpdate(Array.from(selectedIds), true);
    clearSelection();
  }, [clearSelection, onBulkUpdate, selectedIds]);

  const handleSelect = useCallback((id: string) => {
    onSelect(id);
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile, onSelect]);

  const hasSelection = selectedIds.size > 0;

  const controlsContent = useMemo(
    () => (
      <>
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
              onClick={() => onFilterChange(key)}
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
              onClick={ignoreSelection}
              className="inline-flex items-center gap-1 rounded-md border border-destructive/60 px-2 py-1 text-[11px] font-semibold text-destructive transition hover:border-destructive"
            >
              <XCircle className="h-3.5 w-3.5" />
              Ignore
            </button>
            <button
              type="button"
              onClick={includeSelection}
              className="inline-flex items-center gap-1 rounded-md border border-primary/70 px-2 py-1 text-[11px] font-semibold text-primary transition hover:border-primary"
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

        <div
          className={cn(
            "flex flex-col gap-2 overflow-hidden",
            isMobile ? "min-h-0 flex-1 pb-2" : "max-h-[60vh]",
          )}
        >
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

          <TocRows
            filtered={filtered}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onToggleSelect={toggleSelect}
          />
        </div>
      </>
    ),
    [
      clearSelection,
      filter,
      filtered,
      handleSelect,
      hasSelection,
      ignoreSelection,
      includeSelection,
      isMobile,
      onFilterChange,
      selectAllFiltered,
      selectedIds,
      toggleSelect,
    ],
  );

  if (isMobile) {
    return (
      <Drawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        direction="bottom"
        modal={false}
        shouldScaleBackground={false}
      >
        <DrawerTrigger asChild>
          <button
            type="button"
            aria-label="Open library controls"
            className={cn(
              "fixed bottom-4 left-1/2 z-40 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-lg backdrop-blur transition-all duration-200 md:hidden",
              mobileOpen
                ? "pointer-events-none translate-y-3 opacity-0"
                : "pointer-events-auto opacity-100",
            )}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        </DrawerTrigger>
        <DrawerContent
          forceMount
          className="data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:h-dvh data-[vaul-drawer-direction=bottom]:rounded-none"
        >
          <DrawerHeader>
            <DrawerTitle>Library controls</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-1">
            {controlsContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <FloatingControls visible={visible} side={side} onToggle={onToggle}>
      {controlsContent}
    </FloatingControls>
  );
}
