import { NextResponse } from "next/server";
import { BillingError } from "@/lib/billing/errors";
import {
  parseLemonWebhookEvent,
  processLemonWebhook,
  verifyLemonSignature,
} from "@/lib/billing/lemonsqueezy-webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature");

  try {
    if (!verifyLemonSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid Lemon Squeezy signature." }, { status: 401 });
    }

    const { payload, eventName } = parseLemonWebhookEvent(rawBody);
    const subscriptionId = payload.data?.id ?? null;

    console.info("Received Lemon Squeezy webhook", {
      eventName,
      subscriptionId,
    });

    const result = await processLemonWebhook({
      rawBody,
      payload,
      eventName,
    });

    console.info("Processed Lemon Squeezy webhook", {
      eventName,
      subscriptionId: result.subscriptionId,
      duplicate: result.duplicate,
    });

    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid Lemon Squeezy JSON payload." }, { status: 400 });
    }

    if (error instanceof BillingError) {
      if (error.statusCode >= 500) {
        console.error("Lemon Squeezy webhook processing failed", {
          error: error.message,
        });
      }

      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    console.error("Unexpected Lemon Squeezy webhook failure", { error: message });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
