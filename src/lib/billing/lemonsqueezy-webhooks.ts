import { createHmac, timingSafeEqual } from "node:crypto";
import type { Prisma } from "../../../prisma/generated/client";
import prisma from "@/lib/prisma";
import { BillingConfigurationError, BillingValidationError, UnsupportedWebhookEventError } from "@/lib/billing/errors";
import { upsertSubscriptionFromPayload } from "@/lib/billing/subscription-state";
import type { BillingPaymentStatus, LemonWebhookPayload, SupportedLemonEventName } from "@/lib/billing/types";
import { coerceString, createWebhookIdempotencyKey } from "@/lib/billing/utils";

const SUPPORTED_EVENTS: SupportedLemonEventName[] = [
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
  "subscription_payment_failed",
  "subscription_payment_success",
  "subscription_payment_recovered",
  "subscription_payment_refunded",
  "subscription_plan_changed",
];

const PAYMENT_STATUS_BY_EVENT: Partial<Record<SupportedLemonEventName, BillingPaymentStatus>> = {
  subscription_payment_failed: "failed",
  subscription_payment_success: "success",
  subscription_payment_recovered: "recovered",
  subscription_payment_refunded: "refunded",
};

type WebhookContext = {
  tx: Prisma.TransactionClient;
  payload: LemonWebhookPayload;
  rawBody: string;
  eventName: SupportedLemonEventName;
};

type ProcessedWebhookResult = {
  duplicate: boolean;
  subscriptionId: string | null;
};

function getWebhookSecret() {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new BillingConfigurationError("Missing LEMONSQUEEZY_WEBHOOK_SECRET for webhook verification.", 500);
  }

  return secret;
}

export function verifyLemonSignature(rawBody: string, signature: string | null, secret = getWebhookSecret()) {
  const normalizedSignature = signature?.trim().toLowerCase();
  if (!normalizedSignature) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (digest.length !== normalizedSignature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(normalizedSignature, "utf8"));
}

export function parseLemonWebhookEvent(rawBody: string) {
  const payload = JSON.parse(rawBody) as LemonWebhookPayload;
  const eventName = coerceString(payload.meta?.event_name);

  if (!eventName) {
    throw new BillingValidationError("The Lemon Squeezy webhook payload is missing meta.event_name.");
  }

  if (!SUPPORTED_EVENTS.includes(eventName as SupportedLemonEventName)) {
    throw new UnsupportedWebhookEventError(eventName);
  }

  return {
    payload,
    eventName: eventName as SupportedLemonEventName,
  };
}

function resolveResourceStatus(payload: LemonWebhookPayload) {
  const attributes = payload.data?.attributes;
  if (!attributes || typeof attributes !== "object") {
    return null;
  }

  return coerceString(attributes.status);
}

function resolveSubscriptionId(payload: LemonWebhookPayload) {
  return coerceString(payload.data?.id);
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function persistWebhookEvent(context: {
  tx: Prisma.TransactionClient;
  billingId?: string | null;
  accountId?: string | null;
  payload: LemonWebhookPayload;
  rawBody: string;
  eventName: SupportedLemonEventName;
  idempotencyKey: string;
}) {
  const subscriptionId = resolveSubscriptionId(context.payload);

  await context.tx.billingWebhookEvent.create({
    data: {
      idempotencyKey: context.idempotencyKey,
      accountId: context.accountId ?? null,
      billingId: context.billingId ?? null,
      eventName: context.eventName,
      resourceType: coerceString(context.payload.data?.type) ?? "subscriptions",
      resourceId: subscriptionId ?? "unknown",
      subscriptionId,
      status: resolveResourceStatus(context.payload),
      rawBody: context.rawBody,
    },
  });
}

const webhookHandlers: Record<
  SupportedLemonEventName,
  (context: WebhookContext) => Promise<{ billingId: string | null; accountId: string | null }>
> = Object.fromEntries(
  SUPPORTED_EVENTS.map((eventName) => [
    eventName,
    async (context: WebhookContext) => {
      const billing = await upsertSubscriptionFromPayload({
        tx: context.tx,
        payload: context.payload,
        eventName,
        paymentStatus: PAYMENT_STATUS_BY_EVENT[eventName],
      });

      return {
        billingId: billing.id,
        accountId: billing.accountId,
      };
    },
  ]),
) as Record<
  SupportedLemonEventName,
  (context: WebhookContext) => Promise<{ billingId: string | null; accountId: string | null }>
>;

export async function processLemonWebhook(params: {
  rawBody: string;
  payload: LemonWebhookPayload;
  eventName: SupportedLemonEventName;
}): Promise<ProcessedWebhookResult> {
  const idempotencyKey = createWebhookIdempotencyKey(params.rawBody);
  const existingEvent = await prisma.billingWebhookEvent.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  });

  if (existingEvent) {
    return {
      duplicate: true,
      subscriptionId: resolveSubscriptionId(params.payload),
    };
  }

  const handler = webhookHandlers[params.eventName];
  if (!handler) {
    throw new UnsupportedWebhookEventError(params.eventName);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const persisted = await handler({
        tx,
        payload: params.payload,
        rawBody: params.rawBody,
        eventName: params.eventName,
      });

      await persistWebhookEvent({
        tx,
        billingId: persisted.billingId,
        accountId: persisted.accountId,
        payload: params.payload,
        rawBody: params.rawBody,
        eventName: params.eventName,
        idempotencyKey,
      });
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      const duplicateEvent = await prisma.billingWebhookEvent.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });

      if (duplicateEvent) {
        return {
          duplicate: true,
          subscriptionId: resolveSubscriptionId(params.payload),
        };
      }
    }

    throw error;
  }

  return {
    duplicate: false,
    subscriptionId: resolveSubscriptionId(params.payload),
  };
}
