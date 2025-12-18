import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getReaderProgress,
  getUserLibraryFiles,
} from "@/services/backend-services/library-service";
import { downloadJsonFromBlob } from "@/services/backend-services/blob-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const files = await getUserLibraryFiles(session.user.id);
  return NextResponse.json({ files });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileId, fileKey, fileUrl } = body ?? {};
    if (!fileId || !fileKey) {
      return NextResponse.json({ error: "fileId and fileKey are required" }, { status: 400 });
    }

    const progress = await getReaderProgress(session.user.id, fileId).catch(() => null);
    const raw = await downloadJsonFromBlob(fileUrl || fileKey);
    const blocks = Array.isArray(raw?.blocks)
      ? raw.blocks
          .filter((b: any) => !b?.ignored)
          .map((b: any) => ({
            ...b,
            page: typeof b?.page === "number" && !Number.isNaN(b.page) ? b.page : Number(b?.page ?? 0),
          }))
          .sort((a: any, b: any) => {
            const pageA = typeof a?.page === "number" ? a.page : Number(a?.page ?? 0);
            const pageB = typeof b?.page === "number" ? b.page : Number(b?.page ?? 0);
            if (pageA !== pageB) return pageA - pageB;
            return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
          })
      : [];

    return NextResponse.json({ ok: true, progress, blocks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
