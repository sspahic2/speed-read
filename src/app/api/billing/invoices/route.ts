import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBillingInvoicesForUser } from "@/lib/billing/customer-dashboard";
import { BillingError } from "@/lib/billing/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoices = await getBillingInvoicesForUser(session.user.id);
    return NextResponse.json({ invoices });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : "Unable to load billing invoices.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
