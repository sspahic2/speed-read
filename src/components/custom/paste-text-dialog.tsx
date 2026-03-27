"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardPaste } from "lucide-react";
import type { LibraryLoadPayload } from "@/types/reader";

type PasteTextDialogProps = {
  onLoad: (payload: LibraryLoadPayload) => void;
  trigger?: React.ReactNode;
};

function textToBlocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((paragraph, index) => ({
      id: `paste-${index}`,
      text: paragraph.replace(/\n/g, " ").replace(/\s+/g, " "),
      type: "paragraph",
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 22,
      page: 1,
      ignored: false,
    }));
}

export function PasteTextDialog({ onLoad, trigger }: PasteTextDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const handleLoad = () => {
    const blocks = textToBlocks(text);
    if (blocks.length === 0) return;

    onLoad({
      blocks,
      progress: null,
      fileId: "",
    });
    setText("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-foreground transition-colors hover:border-border hover:bg-card/70 hover:text-foreground"
          >
            <ClipboardPaste className="h-4 w-4" />
            Paste text
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Paste your text</DialogTitle>
        </DialogHeader>
        <textarea
          className="h-32 w-full resize-none rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60 sm:h-48"
          placeholder="Paste a speech, article, or any text you want to practice reading..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button
          onClick={handleLoad}
          disabled={text.trim().length === 0}
          className="w-full"
        >
          Start reading
        </Button>
      </DialogContent>
    </Dialog>
  );
}
