import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const endpoint = process.env.EXTRACT_URL?.trim() || "";

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "File is required as form-data field 'file'." },
        { status: 400 },
      );
    }

    const proxyForm = new FormData();
    proxyForm.append("file", file);
    const upstream = await fetch(endpoint + "/extract", {
      method: "POST",
      body: proxyForm,
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: "Extract service error", status: upstream.status, body: text },
        { status: 502 },
      );
    }

    type UpstreamBlock = {
      text?: string;
      type?: string;
      font_size?: number;
      font_weight?: string;
      line_height?: number;
      page?: number;
    };

    const data = await upstream.json();
    const content: UpstreamBlock[] = Array.isArray(data?.content)
      ? data.content
      : [];

    const patched = content.map((block) => {
      const type = (block?.type ?? "paragraph").toString().toLowerCase();
      // Default: nothing is ignored unless we decide otherwise
      const ignoredFlag = type === "heading" || type === "special_paragraph" ? true : false;
      return {
        ...block,
        ignored: ignoredFlag,
      };
    });

    return NextResponse.json({ ...data, content: patched });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected extract error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
