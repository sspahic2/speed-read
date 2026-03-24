import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { BillingError } from "@/lib/billing/errors";
import { getPublishedBillingCatalog } from "@/lib/billing/lemonsqueezy-catalog";

const log = createLogger("api.billing.catalog");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getPublishedBillingCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load billing catalog.";
    log.error("Catalog fetch failed", { error: message });

    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
