"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { FileText, MoreVertical, Pencil, Plus, Settings2, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteLibraryFile,
  loadFileForEditing,
  renameLibraryFile,
  saveTextEntry,
  updateFileBlocks,
  type LibraryFileListItem,
} from "@/services/frontend-services/library-service";

type LibraryDashboardProps = {
  initialFiles: LibraryFileListItem[];
};

export function LibraryDashboard({ initialFiles }: LibraryDashboardProps) {
  const [files, setFiles] = useState(initialFiles);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<LibraryFileListItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LibraryFileListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New text entry state
  const [textOpen, setTextOpen] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [textSaving, setTextSaving] = useState(false);

  // Edit text state
  const [editTextTarget, setEditTextTarget] = useState<LibraryFileListItem | null>(null);
  const [editTextBody, setEditTextBody] = useState("");
  const [editTextLoading, setEditTextLoading] = useState(false);
  const [editTextSaving, setEditTextSaving] = useState(false);

  const textFiles = files.filter((f) => f.sourceType === "text");
  const uploadFiles = files.filter((f) => f.sourceType !== "text");

  function openRename(file: LibraryFileListItem) {
    setMenuOpenId(null);
    setRenameTarget(file);
    setRenameValue(file.fileName);
    setError(null);
  }

  function openDelete(file: LibraryFileListItem) {
    setMenuOpenId(null);
    setDeleteTarget(file);
    setError(null);
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;
    setRenameLoading(true);
    setError(null);
    try {
      await renameLibraryFile(renameTarget.id, renameValue.trim());
      setFiles((prev) =>
        prev.map((f) => (f.id === renameTarget.id ? { ...f, fileName: renameValue.trim() } : f)),
      );
      setRenameTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed.");
    } finally {
      setRenameLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await deleteLibraryFile(deleteTarget.id);
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function openEditText(file: LibraryFileListItem) {
    setMenuOpenId(null);
    setEditTextTarget(file);
    setEditTextBody("");
    setEditTextLoading(true);
    setError(null);
    try {
      const data = await loadFileForEditing(file.id);
      const text = (data.blocks ?? []).map((b) => b.text ?? "").join("\n\n");
      setEditTextBody(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load text.");
      setEditTextTarget(null);
    } finally {
      setEditTextLoading(false);
    }
  }

  async function handleSaveEditText() {
    if (!editTextTarget || !editTextBody.trim()) return;
    setEditTextSaving(true);
    setError(null);
    try {
      const paragraphs = editTextBody
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const blocks = paragraphs.map((text, i) => ({
        id: `text-${i}`,
        text: text.replace(/\n/g, " ").replace(/\s+/g, " "),
        type: "paragraph",
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 22,
        page: 1,
        ignored: false,
      }));

      await updateFileBlocks(editTextTarget.id, blocks);
      setEditTextTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setEditTextSaving(false);
    }
  }

  async function handleSaveText() {
    if (!textTitle.trim() || !textBody.trim()) return;
    setTextSaving(true);
    setError(null);
    try {
      await saveTextEntry(textTitle.trim(), textBody.trim());
      // Reload page to get fresh data from server
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setTextSaving(false);
    }
  }

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
            <p className="text-sm text-muted-foreground">
              {files.length} {files.length === 1 ? "file" : "files"} saved
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setTextOpen(true); setTextTitle(""); setTextBody(""); }}>
              <Type className="size-4" />
              New text
            </Button>
            <Button asChild>
              <Link href="/library/extract">
                <Plus className="size-4" />
                Upload
              </Link>
            </Button>
          </div>
        </div>

        {/* Your texts section */}
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Type className="size-4 text-muted-foreground" />
                Your texts
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setTextOpen(true); setTextTitle(""); setTextBody(""); }}>
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {textFiles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Type className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No texts yet. Paste a speech or article to practice with.
                </p>
              </div>
            ) : (
              <FileList files={textFiles} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} onRename={openRename} onDelete={openDelete} onEditText={openEditText} />
            )}
          </CardContent>
        </Card>

        {/* Books section */}
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                Books
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/library/extract">
                  <Plus className="size-3.5" />
                  Upload
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {uploadFiles.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <FileText className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No books yet. Upload a PDF or EPUB to get started.
                </p>
              </div>
            ) : (
              <FileList files={uploadFiles} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} onRename={openRename} onDelete={openDelete} onEditText={() => {}} />
            )}
          </CardContent>
        </Card>
      </main>

      {/* New text dialog */}
      <Dialog open={textOpen} onOpenChange={setTextOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New text</DialogTitle>
            <DialogDescription>
              Paste a speech, article, or any text you want to practice reading.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Title"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Paste your text here..."
              value={textBody}
              onChange={(e) => setTextBody(e.target.value)}
              className="min-h-[180px] resize-y text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs tabular-nums text-muted-foreground">
                {textBody.trim().split(/\s+/).filter((w) => w.length > 0).length} words
              </span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={textSaving} onClick={() => setTextOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={textSaving || !textTitle.trim() || textBody.trim().split(/\s+/).filter((w) => w.length > 0).length < 2}
                  onClick={() => void handleSaveText()}
                >
                  {textSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogContent>
      </Dialog>

      {/* Edit text dialog */}
      <Dialog open={editTextTarget !== null} onOpenChange={(open) => !open && setEditTextTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit text</DialogTitle>
            <DialogDescription>{editTextTarget?.fileName}</DialogDescription>
          </DialogHeader>
          {editTextLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-4">
              <Textarea
                value={editTextBody}
                onChange={(e) => setEditTextBody(e.target.value)}
                className="min-h-[200px] resize-y text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {editTextBody.trim().split(/\s+/).filter((w) => w.length > 0).length} words
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={editTextSaving} onClick={() => setEditTextTarget(null)}>Cancel</Button>
                  <Button disabled={editTextSaving || editTextBody.trim().split(/\s+/).filter((w) => w.length > 0).length < 2} onClick={() => void handleSaveEditText()}>
                    {editTextSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Enter a new name for this file.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); void handleRename(); }}>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus className="mb-4" />
            {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" disabled={renameLoading} onClick={() => setRenameTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={renameLoading || !renameValue.trim()}>{renameLoading ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.fileName}&rdquo; and its reading progress. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={deleteLoading} onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteLoading} onClick={() => void handleDelete()}>{deleteLoading ? "Deleting..." : "Delete"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FileList({
  files,
  menuOpenId,
  setMenuOpenId,
  onRename,
  onDelete,
  onEditText,
}: {
  files: LibraryFileListItem[];
  menuOpenId: string | null;
  setMenuOpenId: (id: string | null) => void;
  onRename: (file: LibraryFileListItem) => void;
  onDelete: (file: LibraryFileListItem) => void;
  onEditText: (file: LibraryFileListItem) => void;
}) {
  return (
    <div className="divide-y divide-border/60 rounded-xl border border-border/60">
      {files.map((file) => (
        <div key={file.id} className="group flex items-center gap-3 px-4 py-3">
          {file.sourceType === "text" ? (
            <Type className="size-5 shrink-0 text-muted-foreground/60" />
          ) : (
            <FileText className="size-5 shrink-0 text-muted-foreground/60" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.fileName || "Untitled"}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(file.createdAt), "PPP")}</p>
          </div>
          <div className="relative">
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setMenuOpenId(menuOpenId === file.id ? null : file.id)}
            >
              <MoreVertical className="size-4" />
            </button>
            {menuOpenId === file.id ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-border/70 bg-card shadow-lg">
                  {file.sourceType === "text" ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                      onClick={() => onEditText(file)}
                    >
                      <Pencil className="size-3.5" />
                      Edit text
                    </button>
                  ) : (
                    <Link
                      href={`/library/edit/${file.id}`}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                      onClick={() => setMenuOpenId(null)}
                    >
                      <Settings2 className="size-3.5" />
                      Edit blocks
                    </Link>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                    onClick={() => onRename(file)}
                  >
                    <Pencil className="size-3.5" />
                    Rename
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                    onClick={() => onDelete(file)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
