import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { getFreshBillingPortalUrlsForUser } from "@/lib/billing/customer-dashboard";
import { BillingError } from "@/lib/billing/errors";

const log = createLogger("api.billing.portal");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const portalUrls = await getFreshBillingPortalUrlsForUser(session.user.id);
    log.info("Portal URLs resolved", {
      userId: session.user.id,
      fresh: portalUrls.fresh,
      fallback: portalUrls.fallback,
      hasCustomerPortal: Boolean(portalUrls.customerPortalUrl),
    });
    return NextResponse.json(portalUrls);
  } catch (error) {
    if (error instanceof BillingError) {
      log.error("Portal URL request failed", {
        userId: session.user.id,
        error: error.message,
        statusCode: error.statusCode,
      });
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message =
      error instanceof Error ? error.message : "Unable to prepare billing management links.";
    log.error("Unexpected portal URL failure", { userId: session.user.id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
