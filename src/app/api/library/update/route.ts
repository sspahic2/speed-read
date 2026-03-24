import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { uploadJsonToBlob, downloadJsonFromBlob } from "@/services/backend-services/blob-service";

const log = createLogger("api.library.update");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingBlock = {
  id: string;
  text: string;
  type: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  page: number;
  ignored: boolean;
};

/** GET — Load raw blocks (including ignored) for editing */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  try {
    const file = await prisma.libraryFile.findFirst({
      where: { id: fileId, userId: session.user.id },
      select: { id: true, fileUrl: true, fileKey: true, fileName: true },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const raw = await downloadJsonFromBlob(file.fileUrl || file.fileKey);
    const blocks: IncomingBlock[] = Array.isArray(raw?.blocks) ? raw.blocks : [];

    return NextResponse.json({
      fileId: file.id,
      fileName: file.fileName,
      blocks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load file for editing";
    log.error("Edit load failed", { userId: session.user.id, fileId, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — Save updated blocks back to the same file */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      fileId?: string;
      blocks?: IncomingBlock[];
    };

    const { fileId, blocks } = body ?? {};

    if (!fileId || !Array.isArray(blocks) || blocks.length === 0) {
      return NextResponse.json({ error: "fileId and blocks are required" }, { status: 400 });
    }

    const file = await prisma.libraryFile.findFirst({
      where: { id: fileId, userId: session.user.id },
      select: { id: true, fileUrl: true, fileKey: true },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Overwrite the blob with updated blocks
    const uploadResult = await uploadJsonToBlob(file.fileKey, { blocks });

    // Update the fileUrl if it changed
    if (uploadResult.url && uploadResult.url !== file.fileUrl) {
      await prisma.libraryFile.update({
        where: { id: fileId },
        data: { fileUrl: uploadResult.url },
      });
    }

    log.info("Library file blocks updated", {
      userId: session.user.id,
      fileId,
      blockCount: blocks.length,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    log.error("Library update failed", { userId: session.user.id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
