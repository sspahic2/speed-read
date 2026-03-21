import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFreshBillingPortalUrlsForUser } from "@/lib/billing/customer-dashboard";
import { BillingError } from "@/lib/billing/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const portalUrls = await getFreshBillingPortalUrlsForUser(session.user.id);
    return NextResponse.json(portalUrls);
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message =
      error instanceof Error ? error.message : "Unable to prepare billing management links.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
