import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { getPublishedBillingCatalog } from "@/lib/billing/lemonsqueezy-catalog";
import { getSubscriptionStateForUser } from "@/lib/billing/subscription-state";

const log = createLogger("api.billing.status");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [subscriptionState, catalog] = await Promise.all([
      getSubscriptionStateForUser(session.user.id),
      getPublishedBillingCatalog().catch(() => null),
    ]);

    return NextResponse.json({
      ...subscriptionState,
      checkoutEnabled: Boolean(catalog?.enabledVariantIds.length),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load billing status.";
    log.error("Status fetch failed", { userId: session.user.id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
