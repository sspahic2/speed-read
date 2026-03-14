import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPublishedBillingCatalog } from "@/lib/billing/lemonsqueezy-catalog";
import { getSubscriptionStateForUser } from "@/lib/billing/subscription-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [subscriptionState, catalog] = await Promise.all([
    getSubscriptionStateForUser(session.user.id),
    getPublishedBillingCatalog().catch(() => null),
  ]);

  return NextResponse.json({
    ...subscriptionState,
    checkoutEnabled: Boolean(catalog?.enabledVariantIds.length),
  });
}
