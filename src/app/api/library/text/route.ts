import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { ensureUserFolder, uploadJsonToBlob } from "@/services/backend-services/blob-service";
import { recordLibraryFile } from "@/services/backend-services/library-service";

const log = createLogger("api.library.text");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { title?: string; text?: string };
    const title = body.title?.trim();
    const text = body.text?.trim();

    if (!title || !text) {
      return NextResponse.json({ error: "Title and text are required" }, { status: 400 });
    }

    // Convert text into blocks (split by blank lines)
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0) {
      return NextResponse.json({ error: "Text must contain at least one paragraph" }, { status: 400 });
    }

    const blocks = paragraphs.map((paragraph, index) => ({
      id: `text-${index}`,
      text: paragraph.replace(/\n/g, " ").replace(/\s+/g, " "),
      type: "paragraph",
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 22,
      page: 1,
      ignored: false,
    }));

    const userId = session.user.id;
    const fileKey = `${userId}/${randomUUID()}.json`;

    const [uploadResult] = await Promise.all([
      uploadJsonToBlob(fileKey, { blocks }),
      ensureUserFolder(userId),
    ]);

    const storedKey = uploadResult.pathname ?? uploadResult.key ?? fileKey;
    const storedUrl = uploadResult.url ?? fileKey;

    await recordLibraryFile(userId, storedKey, storedUrl, title, "text");

    log.info("Text entry saved to library", { userId, title, blockCount: blocks.length });

    return NextResponse.json({ ok: true, fileKey: storedKey, url: storedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    log.error("Text entry save failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
