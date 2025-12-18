"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/components/lib/utils";
import type { FloatingControlsSide } from "@/components/hooks/use-floating-controls";

type FloatingControlsProps = {
  visible: boolean;
  side: FloatingControlsSide;
  onToggle: () => void;
  children: React.ReactNode;
};

export function FloatingControls({
  visible,
  side,
  onToggle,
  children,
}: FloatingControlsProps) {
  const arrow = side === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />;
  const edgePosition = side === "left" ? "right-0 translate-x-full" : "left-0 -translate-x-full";

  return (
    <div
      className={cn(
        "pointer-events-none fixed top-28 z-20 hidden md:flex transition-[width] duration-200 ease-out",
        side === "left" ? "left-4" : "right-4",
        visible ? "w-[270px]" : "w-12",
      )}
    >
      <div className="pointer-events-auto relative flex w-full flex-col">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-card shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            edgePosition,
          )}
          aria-label="Toggle floating controls"
        >
          {arrow}
        </button>
        <div
          className={cn(
            "flex flex-col gap-3 transition-all duration-200 ease-out",
            visible ? "opacity-100" : "opacity-0 max-h-0 overflow-hidden",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
