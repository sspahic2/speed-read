import type { Prisma } from "../../../prisma/generated/client";
import prisma from "@/lib/prisma";
import { BillingConfigurationError, BillingValidationError } from "@/lib/billing/errors";
import { getPublishedBillingCatalog } from "@/lib/billing/lemonsqueezy-catalog";
import type {
  BillingPaymentStatus,
  BillingPlanInterval,
  LemonWebhookPayload,
  SubscriptionState,
  SupportedLemonEventName,
} from "@/lib/billing/types";
import {
  coerceString,
  computeEntitlementActive,
  normalizePlanInterval,
  normalizePortalUrls,
  parseOptionalDate,
} from "@/lib/billing/utils";

type SubscriptionAttributes = Record<string, unknown>;

function defaultSubscriptionState(accountId: string | null = null): SubscriptionState {
  return {
    isSubscribed: false,
    status: null,
    accountId,
    variantId: null,
    planInterval: "unknown",
    customerPortalUrl: null,
  };
}

function toSubscriptionAttributes(payload: LemonWebhookPayload) {
  const attributes = payload.data?.attributes;
  return (attributes && typeof attributes === "object" ? attributes : {}) as SubscriptionAttributes;
}

function resolvePauseMetadata(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      isPaused: false,
      pauseMode: null,
      pauseResumesAt: null,
    };
  }

  const pause = value as Record<string, unknown>;

  return {
    isPaused: true,
    pauseMode: coerceString(pause.mode),
    pauseResumesAt: parseOptionalDate(pause.resumes_at),
  };
}

function resolvePortalUrls(value: unknown) {
  return normalizePortalUrls(value);
}

async function getPreferredAccountForUserIdWithClient(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string,
) {
  const accounts = await db.account.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
    },
  });

  if (accounts.length === 0) {
    return null;
  }

  return (
    accounts.find((account) => account.provider === "google") ??
    [...accounts].sort((left, right) => left.id.localeCompare(right.id))[0] ??
    null
  );
}

async function resolveAccountForPayload(
  db: Prisma.TransactionClient | typeof prisma,
  payload: LemonWebhookPayload,
  existingAccountId?: string | null,
) {
  if (existingAccountId) {
    return db.account.findUnique({
      where: { id: existingAccountId },
      select: { id: true, provider: true },
    });
  }

  const customData = payload.meta?.custom_data ?? null;
  const accountId = customData && typeof customData === "object" ? coerceString(customData.account_id) : null;
  if (accountId) {
    const directAccount = await db.account.findUnique({
      where: { id: accountId },
      select: { id: true, provider: true },
    });

    if (directAccount) {
      return directAccount;
    }
  }

  const userId = customData && typeof customData === "object" ? coerceString(customData.user_id) : null;
  if (userId) {
    return getPreferredAccountForUserIdWithClient(db, userId);
  }

  return null;
}

async function resolvePlanIntervalFromVariantId(
  variantId: string | null,
  fallback: BillingPlanInterval,
) {
  if (!variantId) {
    return fallback;
  }

  try {
    const catalog = await getPublishedBillingCatalog();
    return catalog.variants.find((variant) => variant.variantId === variantId)?.interval ?? fallback;
  } catch {
    return fallback;
  }
}

function resolveSubscriptionId(payload: LemonWebhookPayload) {
  return coerceString(payload.data?.id);
}

function resolveEventTimestamp(attributes: SubscriptionAttributes) {
  return parseOptionalDate(attributes.updated_at) ?? parseOptionalDate(attributes.created_at) ?? new Date();
}

export async function getAccountForUserId(userId: string) {
  if (!userId) {
    throw new BillingValidationError("A user id is required to resolve the billing account.");
  }

  return getPreferredAccountForUserIdWithClient(prisma, userId);
}

export async function getBillingByAccountId(accountId: string) {
  if (!accountId) {
    throw new BillingValidationError("An account id is required to fetch billing.");
  }

  return prisma.billing.findUnique({
    where: { accountId },
  });
}

export async function getSubscriptionStateForUser(userId: string): Promise<SubscriptionState> {
  const account = await getAccountForUserId(userId);

  if (!account) {
    return defaultSubscriptionState(null);
  }

  const billing = await prisma.billing.findUnique({
    where: { accountId: account.id },
    select: {
      entitlementActive: true,
      status: true,
      accountId: true,
      variantId: true,
      planInterval: true,
      customerPortalUrl: true,
    },
  });

  if (!billing) {
    return defaultSubscriptionState(account.id);
  }

  return {
    isSubscribed: billing.entitlementActive,
    status: billing.status,
    accountId: billing.accountId,
    variantId: billing.variantId,
    planInterval: billing.planInterval,
    customerPortalUrl: billing.customerPortalUrl,
  };
}

export async function upsertSubscriptionFromPayload(params: {
  tx: Prisma.TransactionClient;
  payload: LemonWebhookPayload;
  eventName: SupportedLemonEventName;
  paymentStatus?: BillingPaymentStatus;
}) {
  const subscriptionId = resolveSubscriptionId(params.payload);
  if (!subscriptionId) {
    throw new BillingValidationError("The webhook payload is missing a Lemon Squeezy subscription id.");
  }

  const attributes = toSubscriptionAttributes(params.payload);
  const existingBilling = await params.tx.billing.findUnique({
    where: { lemonSubscriptionId: subscriptionId },
  });

  const account = await resolveAccountForPayload(
    params.tx,
    params.payload,
    existingBilling?.accountId ?? null,
  );

  if (!account) {
    throw new BillingValidationError(
      "Unable to resolve a local account from Lemon Squeezy custom checkout data.",
    );
  }

  const isPaymentEvent = params.eventName.startsWith("subscription_payment_");
  const rawStatus = coerceString(attributes.status);
  const status = isPaymentEvent
    ? existingBilling?.status ?? rawStatus ?? "active"
    : rawStatus ?? existingBilling?.status ?? "inactive";
  const variantId = coerceString(attributes.variant_id) ?? existingBilling?.variantId ?? null;
  const endsAt = parseOptionalDate(attributes.ends_at);
  const pause = resolvePauseMetadata(attributes.pause);
  const urls = resolvePortalUrls(attributes.urls);
  const planInterval = await resolvePlanIntervalFromVariantId(
    variantId,
    normalizePlanInterval(existingBilling?.planInterval),
  );
  const eventAt = resolveEventTimestamp(attributes);

  return params.tx.billing.upsert({
    where: {
      accountId: account.id,
    },
    create: {
      accountId: account.id,
      lemonSubscriptionId: subscriptionId,
      lemonCustomerId: coerceString(attributes.customer_id),
      status,
      entitlementActive: computeEntitlementActive({ status, endsAt }),
      productId: coerceString(attributes.product_id),
      variantId,
      planInterval,
      isPaused: pause.isPaused,
      pauseMode: pause.pauseMode,
      pauseResumesAt: pause.pauseResumesAt,
      renewsAt: parseOptionalDate(attributes.renews_at),
      endsAt,
      trialEndsAt: parseOptionalDate(attributes.trial_ends_at),
      customerPortalUrl: urls.customerPortalUrl,
      updatePaymentMethodUrl: urls.updatePaymentMethodUrl,
      updateSubscriptionUrl: urls.updateSubscriptionUrl,
      lastPaymentStatus: params.paymentStatus,
      lastPaymentAt: params.paymentStatus ? eventAt : null,
      lastEventName: params.eventName,
      lastEventAt: eventAt,
    },
    update: {
      lemonSubscriptionId: subscriptionId,
      lemonCustomerId: coerceString(attributes.customer_id) ?? existingBilling?.lemonCustomerId ?? undefined,
      status,
      entitlementActive: computeEntitlementActive({ status, endsAt }),
      productId: coerceString(attributes.product_id) ?? existingBilling?.productId ?? undefined,
      variantId,
      planInterval,
      isPaused: pause.isPaused,
      pauseMode: pause.pauseMode,
      pauseResumesAt: pause.pauseResumesAt,
      renewsAt: parseOptionalDate(attributes.renews_at),
      endsAt,
      trialEndsAt: parseOptionalDate(attributes.trial_ends_at),
      customerPortalUrl: urls.customerPortalUrl ?? existingBilling?.customerPortalUrl ?? undefined,
      updatePaymentMethodUrl:
        urls.updatePaymentMethodUrl ?? existingBilling?.updatePaymentMethodUrl ?? undefined,
      updateSubscriptionUrl:
        urls.updateSubscriptionUrl ?? existingBilling?.updateSubscriptionUrl ?? undefined,
      lastPaymentStatus: params.paymentStatus ?? existingBilling?.lastPaymentStatus ?? undefined,
      lastPaymentAt: params.paymentStatus ? eventAt : existingBilling?.lastPaymentAt ?? undefined,
      lastEventName: params.eventName,
      lastEventAt: eventAt,
    },
  });
}

export async function getRequiredBillingCatalog() {
  const catalog = await getPublishedBillingCatalog();

  if (!catalog.enabledVariantIds.length) {
    throw new BillingConfigurationError("Billing catalog is empty. No checkout variants are available.", 503);
  }

  return catalog;
}
