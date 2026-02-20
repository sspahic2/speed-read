"use client";

import { FloatingControls } from "@/components/custom/floating-controls";
import { ControlCard } from "@/components/custom/control-card";
import { Slider } from "@/components/ui/slider";
import type { FloatingControlsSide } from "@/components/hooks/use-floating-controls";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import type { UseLibraryLoaderReturn } from "@/components/hooks/use-library-loader";

type FloatingControlsReaderProps = {
  fontSize: number;
  wpm: number;
  rampSeconds: number;
  side: FloatingControlsSide;
  visible: boolean;
  onToggle: () => void;
  onFontSizeChange: (value: number) => void;
  onWpmChange: (value: number) => void;
  onRampSecondsChange: (value: number) => void;
  library: UseLibraryLoaderReturn;
  isAuthenticated: boolean;
};

export function FloatingControlsReader({
  fontSize,
  wpm,
  rampSeconds,
  side,
  visible,
  onToggle,
  onFontSizeChange,
  onWpmChange,
  onRampSecondsChange,
  library,
  isAuthenticated,
}: FloatingControlsReaderProps) {
  const truncated = (name: string, max = 32) => {
    if (name.length <= max) return name;
    const half = Math.floor((max - 3) / 2);
    return `${name.slice(0, half)}...${name.slice(-half)}`;
  };

  return (
    <FloatingControls visible={visible} side={side} onToggle={onToggle}>
      <ControlCard title="From Library" valueLabel="">
        <Dialog open={library.open} onOpenChange={library.setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              disabled={!isAuthenticated}
              className="w-full justify-start gap-2 text-foreground transition-colors hover:border-border hover:bg-card/70 hover:text-foreground"
            >
              <BookOpen className="h-4 w-4" />
              {library.selectedFile
                ? truncated(library.selectedFile.name)
                : isAuthenticated
                  ? "Select file"
                  : "Sign in to select a file"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose a file</DialogTitle>
            </DialogHeader>
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
        </ControlCard>

      <ControlCard title="Font size" valueLabel={`${fontSize}px`}>
        <Slider
          value={[fontSize]}
          min={20}
          max={60}
          step={1}
          onValueChange={(values) => onFontSizeChange(values[0] ?? 32)}
        />
      </ControlCard>

      <ControlCard title="WPM" valueLabel={`${wpm} wpm`}>
        <Slider
          value={[wpm]}
          min={150}
          max={600}
          step={10}
          onValueChange={(values) => onWpmChange(values[0] ?? 150)}
        />
      </ControlCard>

      <ControlCard
        title="Ramp up"
        valueLabel={`${rampSeconds}s`}
        tooltip="Start at 150 WPM and ramp to your target over this many seconds."
      >
        <Slider
          value={[rampSeconds]}
          min={0}
          max={5}
          step={0.5}
          onValueChange={(values) => onRampSecondsChange(values[0] ?? 0)}
        />
      </ControlCard>
    </FloatingControls>
  );
}
