import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { BillingError } from "@/lib/billing/errors";
import { cancelLemonSubscription } from "@/lib/billing/lemonsqueezy-client";
import { getBillingContextForUser } from "@/lib/billing/customer-dashboard";
import { computeEntitlementActive, parseOptionalDate } from "@/lib/billing/utils";

const log = createLogger("api.billing.unsubscribe");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const context = await getBillingContextForUser(session.user.id);

    if (!context.billing?.lemonSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found." },
        { status: 404 },
      );
    }

    const currentStatus = context.billing.status?.toLowerCase();
    if (currentStatus === "cancelled" || currentStatus === "expired") {
      return NextResponse.json(
        { error: "This subscription is already cancelled." },
        { status: 409 },
      );
    }

    log.info("Cancelling subscription", {
      userId: session.user.id,
      subscriptionId: context.billing.lemonSubscriptionId,
      currentStatus: context.billing.status,
    });

    const result = await cancelLemonSubscription(context.billing.lemonSubscriptionId);
    const attrs = result.data.attributes;
    const newStatus = attrs.status ?? "cancelled";
    const endsAt = parseOptionalDate(attrs.ends_at);

    await prisma.billing.update({
      where: { accountId: context.billing.accountId },
      data: {
        status: newStatus,
        entitlementActive: computeEntitlementActive({ status: newStatus, endsAt }),
        endsAt,
        lastEventName: "subscription_cancelled",
        lastEventAt: new Date(),
      },
    });

    log.info("Subscription cancelled and billing record updated", {
      userId: session.user.id,
      subscriptionId: context.billing.lemonSubscriptionId,
      newStatus,
      endsAt: endsAt?.toISOString() ?? null,
    });

    return NextResponse.json({
      cancelled: true,
      endsAt: endsAt?.toISOString() ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel subscription.";
    log.error("Unsubscribe failed", { userId: session.user.id, error: message });

    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
