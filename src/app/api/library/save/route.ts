import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureUserFolder, uploadJsonToBlob } from "@/services/backend-services/blob-service";
import { recordLibraryFile } from "@/services/backend-services/library-service";

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { blocks?: IncomingBlock[]; fileName?: string };
    const blocks = Array.isArray(body?.blocks) ? body.blocks : [];
    if (blocks.length === 0) {
      return NextResponse.json({ error: "No blocks provided" }, { status: 400 });
    }
    const fileName = body.fileName || "library.json";

    const userId = session.user.id;
    await ensureUserFolder(userId);
    const fileKey = `${userId}/${randomUUID()}.json`;

    const uploadResult = await uploadJsonToBlob(fileKey, { blocks });
    const storedKey = uploadResult.pathname ?? uploadResult.key ?? fileKey;
    const storedUrl = uploadResult.url ?? fileKey;

    await Promise.all([
      recordLibraryFile(userId, storedKey, storedUrl, fileName),
    ]);

    return NextResponse.json({ ok: true, fileKey: storedKey, url: storedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
