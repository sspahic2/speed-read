import { NextResponse } from "next/server";
import { BillingError } from "@/lib/billing/errors";
import { getPublishedBillingCatalog } from "@/lib/billing/lemonsqueezy-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getPublishedBillingCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : "Failed to load billing catalog.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
