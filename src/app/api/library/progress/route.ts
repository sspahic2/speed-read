import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveReaderProgress } from "@/services/backend-services/library-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileId, blockId, offset } = body ?? {};
    if (!fileId || !blockId || typeof offset !== "number") {
      return NextResponse.json(
        { error: "fileId, blockId, and numeric offset are required." },
        { status: 400 },
      );
    }

    await saveReaderProgress({
      userId: session.user.id,
      fileId,
      blockId,
      offset,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Progress save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
