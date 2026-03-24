import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { BillingError } from "@/lib/billing/errors";
import {
  parseLemonWebhookEvent,
  processLemonWebhook,
  verifyLemonSignature,
} from "@/lib/billing/lemonsqueezy-webhooks";

const log = createLogger("webhook.lemonsqueezy");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature");

  try {
    if (!verifyLemonSignature(rawBody, signature)) {
      log.warn("Webhook signature verification failed");
      return NextResponse.json({ error: "Invalid Lemon Squeezy signature." }, { status: 401 });
    }

    const { payload, eventName } = parseLemonWebhookEvent(rawBody);
    const subscriptionId = payload.data?.id ?? null;

    log.info("Received Lemon Squeezy webhook", { eventName, subscriptionId });

    const result = await processLemonWebhook({
      rawBody,
      payload,
      eventName,
    });

    log.info("Processed Lemon Squeezy webhook", {
      eventName,
      subscriptionId: result.subscriptionId,
      duplicate: result.duplicate,
    });

    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof SyntaxError) {
      log.warn("Invalid JSON in webhook payload");
      return NextResponse.json({ error: "Invalid Lemon Squeezy JSON payload." }, { status: 400 });
    }

    if (error instanceof BillingError) {
      log.error("Webhook processing failed", {
        error: error.message,
        statusCode: error.statusCode,
      });
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    log.error("Unexpected webhook failure", { error: message });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
