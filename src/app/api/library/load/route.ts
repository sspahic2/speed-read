import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { getSubscriptionStateForUser } from "@/lib/billing/subscription-state";
import {
  deleteLibraryFile,
  getReaderProgress,
  getUserLibraryFiles,
  renameLibraryFile,
} from "@/services/backend-services/library-service";
import { downloadJsonFromBlob } from "@/services/backend-services/blob-service";

const log = createLogger("api.library");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptionState = await getSubscriptionStateForUser(session.user.id);
  if (!subscriptionState.isSubscribed) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }
  const files = await getUserLibraryFiles(session.user.id);
  return NextResponse.json({ files });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptionState = await getSubscriptionStateForUser(session.user.id);
  if (!subscriptionState.isSubscribed) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { fileId, fileKey, fileUrl } = body ?? {};
    if (!fileId || !fileKey) {
      return NextResponse.json({ error: "fileId and fileKey are required" }, { status: 400 });
    }

    const progressPromise = getReaderProgress(session.user.id, fileId).catch(() => null);
    const rawPromise = downloadJsonFromBlob(fileUrl || fileKey);
    const [progress, raw] = await Promise.all([progressPromise, rawPromise]);
    const blocks = Array.isArray(raw?.blocks)
      ? raw.blocks
          .filter((b: any) => !b?.ignored)
          .map((b: any, originalIndex: number) => ({
            ...b,
            page: typeof b?.page === "number" && !Number.isNaN(b.page) ? b.page : Number(b?.page ?? 0),
            _originalIndex: originalIndex,
          }))
          .sort((a: any, b: any) => {
            const pageA = typeof a?.page === "number" ? a.page : Number(a?.page ?? 0);
            const pageB = typeof b?.page === "number" ? b.page : Number(b?.page ?? 0);
            if (pageA !== pageB) return pageA - pageB;
            return (a._originalIndex as number) - (b._originalIndex as number);
          })
          .map(({ _originalIndex, ...block }: any) => block)
      : [];

    return NextResponse.json({ ok: true, progress, blocks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileId, fileName } = body ?? {};

    if (!fileId || !fileName?.trim()) {
      return NextResponse.json({ error: "fileId and fileName are required" }, { status: 400 });
    }

    await renameLibraryFile(session.user.id, fileId, fileName);
    log.info("Library file renamed", { userId: session.user.id, fileId, fileName });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rename failed";
    log.error("Library rename failed", { userId: session.user.id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileId } = body ?? {};

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    await deleteLibraryFile(session.user.id, fileId);
    log.info("Library file deleted", { userId: session.user.id, fileId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    log.error("Library delete failed", { userId: session.user.id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
