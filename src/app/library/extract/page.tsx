"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FloatingControlsLibrary } from "@/components/custom/floating-controls-library";
import type { FloatingControlsSide } from "@/components/hooks/use-floating-controls";
import BlockPreview from "@/components/custom/block-preview";
import { useUploadAndIgnore } from "@/components/hooks/use-upload-and-ignore";

export default function LibraryExtractPage() {
  const {
    file,
    setFile,
    blocks,
    error,
    isLoading,
    hasExtracted,
    isSaving,
    saveMessage,
    tocVisible,
    setTocVisible,
    tocItems,
    ignoredRef,
    setBlockIgnored,
    onBulkUpdate,
    handleSubmit,
    handleSave,
    pages,
    refreshTrigger,
  } = useUploadAndIgnore();
  const [tocSide] = useState<FloatingControlsSide>("left");

  const handleScrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    }
  };

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Upload a document</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="file-input">PDF or EPUB</Label>
                  <Input
                    id="file-input"
                    type="file"
                    accept=".pdf,application/pdf,.epub"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We will attempt to find what you want to read from your document.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={isLoading} className="min-w-[140px]">
                    {isLoading ? "Parsing..." : "Send"}
                  </Button>
                  {hasExtracted && (
                    <Button type="button" variant="secondary" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  )}
                </div>
              </div>

              {file && (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      Ready
                    </Badge>
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {saveMessage && (
                <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {saveMessage}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <section
          className="rounded-4xl bg-card/40 px-4 pt-12 shadow-inner shadow-black/20 sm:px-6 overflow-x-hidden"
          style={{ minHeight: "100vh" }}
        >
          <header className="pb-6 text-center">
            <h2 className="text-lg font-semibold leading-tight">Book preview</h2>
            <p className="text-sm text-muted-foreground">
              {blocks.length === 0
                ? "Upload a document to see the extracted pages laid out like a book."
                : `Showing ${pages.length} page${pages.length === 1 ? "" : "s"}.`}
            </p>
          </header>
          {blocks.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl bg-muted/20 text-sm text-muted-foreground">
              Upload a PDF or EPUB to see the extracted blocks in a book-like view.
            </div>
          ) : (
            <div className="relative overflow-x-hidden">
              <FloatingControlsLibrary
                items={tocItems}
                visible={tocVisible}
                side={tocSide}
                onToggle={() => setTocVisible((prev) => !prev)}
                onSelect={handleScrollTo}
                onBulkUpdate={onBulkUpdate}
              />
              <div className="max-h-[80vh] space-y-8 overflow-y-auto overflow-x-hidden pr-0 md:pr-4">
                {pages.map(({ page, items }) => (
                  <div key={page} className="relative mx-auto max-w-[720px] px-2 py-12 sm:px-4 lg:px-10">
                    <div className="space-y-6">
                      {items.map((block) => (
                        <BlockPreview
                          key={block.id}
                          block={block}
                          ignoredRef={ignoredRef}
                          onSetIgnored={setBlockIgnored}
                          refreshTrigger={refreshTrigger}
                        />
                      ))}
                    </div>
                    <div className="mt-8 flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      <div className="h-px w-full bg-border/60" />
                      <span>Page {page}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
