"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader as ModalHeader,
  DialogTitle as ModalTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ControlBlock } from "@/components/custom/control-block";
import { cn } from "@/components/lib/utils";
import { BookOpen, ChevronUp } from "lucide-react";
import type { UseLibraryLoaderReturn } from "@/components/hooks/use-library-loader";

type ReaderDrawerProps = {
  fontSize: number;
  wpm: number;
  onFontSizeChange: (value: number) => void;
  onWpmChange: (value: number) => void;
  rampSeconds: number;
  onRampSecondsChange: (value: number) => void;
  library: UseLibraryLoaderReturn;
  isAuthenticated: boolean;
  useMobileLayout: boolean;
  isLandscape: boolean;
  useSplitLayout: boolean;
};

export function ReaderDrawer({
  fontSize,
  wpm,
  onFontSizeChange,
  onWpmChange,
  rampSeconds,
  onRampSecondsChange,
  library,
  isAuthenticated,
  useMobileLayout,
  isLandscape,
  useSplitLayout,
}: ReaderDrawerProps) {
  const [open, setOpen] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const truncated = (name: string, max = 32) => {
    if (name.length <= max) return name;
    const half = Math.floor((max - 3) / 2);
    return `${name.slice(0, half)}...${name.slice(-half)}`;
  };

  useEffect(() => {
    if (!useMobileLayout) {
      setOpen(false);
    }
  }, [useMobileLayout]);

  if (!useMobileLayout) {
    return null;
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLButtonElement>) => {
    setTouchStartY(event.touches[0]?.clientY ?? null);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (touchStartY === null) return;
    const currentY = event.touches[0]?.clientY ?? touchStartY;
    const deltaY = currentY - touchStartY;
    if (deltaY < -20) {
      setOpen(true);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(null);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label="Open reader controls"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={cn(
            "fixed bottom-4 left-1/2 z-40 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-lg backdrop-blur transition-all duration-200",
            open ? "pointer-events-none translate-y-3 opacity-0" : "pointer-events-auto opacity-100",
          )}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      </DrawerTrigger>
      <DrawerContent
        className={cn(
          "overflow-y-auto",
          isLandscape
            ? "data-[vaul-drawer-direction=bottom]:max-h-[70dvh]"
            : "data-[vaul-drawer-direction=bottom]:max-h-[88dvh]",
        )}
      >
        <DrawerHeader>
          <DrawerTitle>Reader controls</DrawerTitle>
          <DrawerDescription>Adjust font size and pacing.</DrawerDescription>
        </DrawerHeader>
        <div className={cn("p-4", useSplitLayout ? "grid grid-cols-2 gap-4" : "space-y-6")}>
          <div className={cn(useSplitLayout && "min-w-0")}>
            <ControlBlock
              id="drawer-library"
              label="From library"
              valueLabel={library.selectedFile ? truncated(library.selectedFile.name, useSplitLayout ? 14 : 18) : ""}
            >
              <Dialog open={library.open} onOpenChange={library.setOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!isAuthenticated}
                    className="w-full justify-start gap-2 text-foreground transition-colors hover:border-border hover:bg-card/70 hover:text-foreground"
                  >
                    <BookOpen className="h-4 w-4" />
                    {library.selectedFile
                      ? truncated(library.selectedFile.name, useSplitLayout ? 16 : 24)
                      : isAuthenticated
                        ? "Select file"
                        : "Sign in to select a file"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <ModalHeader>
                    <ModalTitle>Choose a file</ModalTitle>
                  </ModalHeader>
                  {library.loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : library.error ? (
                    <p className="text-sm text-destructive">{library.error}</p>
                  ) : library.files.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No files saved yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {library.files.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-muted/40 px-3 py-2 text-left transition hover:border-border hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                          disabled={!!library.loadingFileId}
                          onClick={() => library.handleLoad(file.id, file.fileKey, file.fileUrl)}
                        >
                          <div className="flex flex-col">
                            <span className="truncate text-sm font-medium text-foreground group-hover:text-foreground">
                              {file.fileName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(file.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {library.loadingFileId === file.id && (
                            <span className="text-xs text-muted-foreground">Loading...</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </ControlBlock>
          </div>

          <div className={cn(useSplitLayout && "min-w-0")}>
            <ControlBlock
              id="drawer-font-size"
              label="Font size"
              valueLabel={`${fontSize}px`}
            >
              <Slider
                id="drawer-font-size"
                value={[fontSize]}
                min={24}
                max={48}
                step={1}
                onValueChange={(values) => onFontSizeChange(values[0] ?? 24)}
              />
            </ControlBlock>
          </div>

          <div className={cn(useSplitLayout && "min-w-0")}>
            <ControlBlock
              id="drawer-wpm"
              label="Words per minute"
              valueLabel={`${wpm} wpm`}
            >
              <Slider
                id="drawer-wpm"
                value={[wpm]}
                min={150}
                max={350}
                step={10}
                onValueChange={(values) => onWpmChange(values[0] ?? 150)}
              />
            </ControlBlock>
          </div>

          <div className={cn(useSplitLayout && "min-w-0")}>
            <ControlBlock
              id="drawer-ramp"
              label="Ramp up"
              valueLabel={`${rampSeconds}s`}
            >
              <Slider
                id="drawer-ramp"
                value={[rampSeconds]}
                min={0}
                max={5}
                step={0.5}
                onValueChange={(values) => onRampSecondsChange(values[0] ?? 0)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Start at 150 WPM and ease up to your target speed.
              </p>
            </ControlBlock>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
