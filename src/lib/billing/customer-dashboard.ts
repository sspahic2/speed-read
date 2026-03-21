import type { Prisma } from "../../../prisma/generated/client";
import prisma from "@/lib/prisma";
import { BillingValidationError } from "@/lib/billing/errors";
import { getPublishedBillingCatalog } from "@/lib/billing/lemonsqueezy-catalog";
import {
  getLemonSubscription,
  listLemonSubscriptionInvoices,
  type LemonSubscriptionInvoiceResource,
} from "@/lib/billing/lemonsqueezy-client";
import { getAccountForUserId } from "@/lib/billing/subscription-state";
import type {
  BillingDashboardSummary,
  BillingInvoice,
  BillingPaymentStatus,
  BillingPortalResponse,
  BillingPortalUrls,
  PublishedBillingCatalog,
} from "@/lib/billing/types";
import { coerceString, normalizePortalUrls } from "@/lib/billing/utils";

const BILLING_DASHBOARD_SELECT = {
  accountId: true,
  lemonSubscriptionId: true,
  lemonCustomerId: true,
  status: true,
  entitlementActive: true,
  productId: true,
  variantId: true,
  planInterval: true,
  isPaused: true,
  pauseMode: true,
  pauseResumesAt: true,
  renewsAt: true,
  endsAt: true,
  trialEndsAt: true,
  customerPortalUrl: true,
  updatePaymentMethodUrl: true,
  updateSubscriptionUrl: true,
  lastPaymentStatus: true,
  lastPaymentAt: true,
  lastEventName: true,
  lastEventAt: true,
} satisfies Prisma.BillingSelect;

type BillingDashboardRecord = Prisma.BillingGetPayload<{
  select: typeof BILLING_DASHBOARD_SELECT;
}>;

type BillingContext = {
  accountId: string | null;
  billing: BillingDashboardRecord | null;
};

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function titleCaseFromToken(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = value
    .trim()
    .replace(/[_-]+/g, " ")
    .toLowerCase();

  if (!normalized) {
    return fallback;
  }

  return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatPlanLabel(interval: BillingDashboardSummary["planInterval"]) {
  switch (interval) {
    case "month":
      return "Monthly";
    case "year":
      return "Yearly";
    default:
      return "Unknown interval";
  }
}

function formatPaymentStatusLabel(status: BillingPaymentStatus | null) {
  return status ? titleCaseFromToken(status, "Unknown") : null;
}

function getStoredPortalUrls(billing: BillingDashboardRecord): BillingPortalUrls {
  return {
    customerPortalUrl: billing.customerPortalUrl,
    updatePaymentMethodUrl: billing.updatePaymentMethodUrl,
    updateSubscriptionUrl: billing.updateSubscriptionUrl,
  };
}

function buildBillingDashboardSummary(params: {
  accountId: string | null;
  billing: BillingDashboardRecord | null;
  catalog: PublishedBillingCatalog | null;
}): BillingDashboardSummary {
  const storeBillingUrl = params.catalog ? `${params.catalog.storeUrl}/billing` : null;

  if (!params.billing) {
    return {
      hasBillingRecord: false,
      isSubscribed: false,
      status: null,
      accountId: params.accountId,
      lemonSubscriptionId: null,
      lemonCustomerId: null,
      productId: null,
      productName: null,
      variantId: null,
      variantName: null,
      planInterval: "unknown",
      planLabel: "No active plan",
      statusLabel: "No subscription",
      entitlementLabel: "Reader access is inactive",
      customerPortalUrl: null,
      updatePaymentMethodUrl: null,
      updateSubscriptionUrl: null,
      storeBillingUrl,
      isPaused: false,
      pauseMode: null,
      pauseResumesAt: null,
      renewsAt: null,
      endsAt: null,
      trialEndsAt: null,
      lastPaymentStatus: null,
      lastPaymentStatusLabel: null,
      lastPaymentAt: null,
      lastEventName: null,
      lastEventAt: null,
    };
  }

  const matchedVariant =
    params.catalog?.variants.find((variant) => variant.variantId === params.billing?.variantId) ?? null;
  const productName =
    matchedVariant || params.catalog?.productId === params.billing.productId ? params.catalog?.productName ?? null : null;

  return {
    hasBillingRecord: true,
    isSubscribed: params.billing.entitlementActive,
    status: params.billing.status,
    accountId: params.billing.accountId,
    lemonSubscriptionId: params.billing.lemonSubscriptionId,
    lemonCustomerId: params.billing.lemonCustomerId,
    productId: params.billing.productId,
    productName,
    variantId: params.billing.variantId,
    variantName: matchedVariant?.variantName ?? null,
    planInterval: params.billing.planInterval,
    planLabel: formatPlanLabel(params.billing.planInterval),
    statusLabel: titleCaseFromToken(params.billing.status, "No subscription"),
    entitlementLabel: params.billing.entitlementActive
      ? "Reader access is active"
      : "Reader access is inactive",
    customerPortalUrl: params.billing.customerPortalUrl,
    updatePaymentMethodUrl: params.billing.updatePaymentMethodUrl,
    updateSubscriptionUrl: params.billing.updateSubscriptionUrl,
    storeBillingUrl,
    isPaused: params.billing.isPaused,
    pauseMode: params.billing.pauseMode,
    pauseResumesAt: toIsoString(params.billing.pauseResumesAt),
    renewsAt: toIsoString(params.billing.renewsAt),
    endsAt: toIsoString(params.billing.endsAt),
    trialEndsAt: toIsoString(params.billing.trialEndsAt),
    lastPaymentStatus: params.billing.lastPaymentStatus,
    lastPaymentStatusLabel: formatPaymentStatusLabel(params.billing.lastPaymentStatus),
    lastPaymentAt: toIsoString(params.billing.lastPaymentAt),
    lastEventName: params.billing.lastEventName,
    lastEventAt: toIsoString(params.billing.lastEventAt),
  };
}

function normalizeInvoice(resource: LemonSubscriptionInvoiceResource): BillingInvoice {
  const attributes = resource.attributes;
  const urls =
    attributes.urls && typeof attributes.urls === "object"
      ? (attributes.urls as Record<string, unknown>)
      : {};

  return {
    id: resource.id,
    subscriptionId: coerceString(attributes.subscription_id),
    orderId: coerceString(attributes.order_id),
    number: coerceString(attributes.number),
    createdAt: coerceString(attributes.created_at),
    billingReason: coerceString(attributes.billing_reason),
    billingReasonLabel: titleCaseFromToken(coerceString(attributes.billing_reason), "Invoice"),
    status: coerceString(attributes.status),
    statusLabel:
      coerceString(attributes.status_formatted) ??
      titleCaseFromToken(coerceString(attributes.status), "Unknown"),
    totalFormatted: coerceString(attributes.total_formatted),
    refunded: Boolean(attributes.refunded),
    refundedAmountFormatted: coerceString(attributes.refunded_amount_formatted),
    invoiceUrl: coerceString(urls.invoice_url),
  };
}

async function listNormalizedInvoices(subscriptionId: string) {
  const invoices = await listLemonSubscriptionInvoices(subscriptionId);

  return invoices
    .map(normalizeInvoice)
    .toSorted((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    });
}

export async function getBillingContextForUser(userId: string): Promise<BillingContext> {
  if (!userId) {
    throw new BillingValidationError("A user id is required to fetch billing dashboard data.");
  }

  const account = await getAccountForUserId(userId);

  if (!account) {
    return {
      accountId: null,
      billing: null,
    };
  }

  const billing = await prisma.billing.findUnique({
    where: { accountId: account.id },
    select: BILLING_DASHBOARD_SELECT,
  });

  return {
    accountId: account.id,
    billing,
  };
}

export async function getBillingDashboardPageDataForUser(userId: string) {
  const context = await getBillingContextForUser(userId);
  const shouldLoadCatalog = Boolean(context.billing);
  const shouldLoadInvoices = Boolean(context.billing?.lemonSubscriptionId);

  const [catalog, invoiceResult] = await Promise.all([
    shouldLoadCatalog ? getPublishedBillingCatalog().catch(() => null) : Promise.resolve(null),
    shouldLoadInvoices
      ? listNormalizedInvoices(context.billing!.lemonSubscriptionId)
          .then((invoices) => ({ invoices, error: null as string | null }))
          .catch((error) => ({
            invoices: [] as BillingInvoice[],
            error:
              error instanceof Error
                ? error.message
                : "Unable to load invoice history from Lemon Squeezy.",
          }))
      : Promise.resolve({ invoices: [] as BillingInvoice[], error: null }),
  ]);

  return {
    summary: buildBillingDashboardSummary({
      accountId: context.accountId,
      billing: context.billing,
      catalog,
    }),
    invoices: invoiceResult.invoices,
    invoiceError: invoiceResult.error,
  };
}

export async function getBillingInvoicesForUser(userId: string) {
  const context = await getBillingContextForUser(userId);

  if (!context.billing?.lemonSubscriptionId) {
    return [] as BillingInvoice[];
  }

  return listNormalizedInvoices(context.billing.lemonSubscriptionId);
}

export async function getFreshBillingPortalUrlsForUser(userId: string): Promise<BillingPortalResponse> {
  const context = await getBillingContextForUser(userId);

  if (!context.billing?.lemonSubscriptionId) {
    throw new BillingValidationError("No billing subscription was found for the current user.", 404);
  }

  const storedUrls = getStoredPortalUrls(context.billing);

  try {
    const subscription = await getLemonSubscription(context.billing.lemonSubscriptionId);
    const freshUrls = normalizePortalUrls(subscription.attributes.urls);
    const mergedUrls: BillingPortalUrls = {
      customerPortalUrl: freshUrls.customerPortalUrl ?? storedUrls.customerPortalUrl,
      updatePaymentMethodUrl:
        freshUrls.updatePaymentMethodUrl ?? storedUrls.updatePaymentMethodUrl,
      updateSubscriptionUrl: freshUrls.updateSubscriptionUrl ?? storedUrls.updateSubscriptionUrl,
    };

    const hasFreshUrl = Boolean(
      freshUrls.customerPortalUrl ||
        freshUrls.updatePaymentMethodUrl ||
        freshUrls.updateSubscriptionUrl,
    );

    if (!mergedUrls.customerPortalUrl && !mergedUrls.updatePaymentMethodUrl && !mergedUrls.updateSubscriptionUrl) {
      throw new BillingValidationError("Lemon Squeezy did not return any billing action URLs.", 502);
    }

    if (
      mergedUrls.customerPortalUrl !== context.billing.customerPortalUrl ||
      mergedUrls.updatePaymentMethodUrl !== context.billing.updatePaymentMethodUrl ||
      mergedUrls.updateSubscriptionUrl !== context.billing.updateSubscriptionUrl
    ) {
      await prisma.billing.update({
        where: { accountId: context.billing.accountId },
        data: {
          customerPortalUrl: mergedUrls.customerPortalUrl,
          updatePaymentMethodUrl: mergedUrls.updatePaymentMethodUrl,
          updateSubscriptionUrl: mergedUrls.updateSubscriptionUrl,
        },
      });
    }

    return {
      ...mergedUrls,
      fresh: hasFreshUrl,
      fallback: false,
    };
  } catch (error) {
    if (storedUrls.customerPortalUrl || storedUrls.updatePaymentMethodUrl || storedUrls.updateSubscriptionUrl) {
      return {
        ...storedUrls,
        fresh: false,
        fallback: true,
      };
    }

    throw error;
  }
}
