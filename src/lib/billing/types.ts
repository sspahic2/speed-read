export type BillingPlanInterval = "month" | "year" | "unknown";
export type BillingPaymentStatus = "failed" | "success" | "recovered" | "refunded";

export type SubscriptionState = {
  isSubscribed: boolean;
  status: string | null;
  accountId: string | null;
  variantId: string | null;
  planInterval: BillingPlanInterval;
  customerPortalUrl: string | null;
};

export type BillingPortalUrls = {
  customerPortalUrl: string | null;
  updatePaymentMethodUrl: string | null;
  updateSubscriptionUrl: string | null;
};

export type BillingCatalogVariant = {
  variantId: string;
  variantName: string;
  interval: BillingPlanInterval;
  price: number;
  currency: string;
  priceFormatted: string;
  sort: number;
};

export type PublishedBillingCatalog = {
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeUrl: string;
  currency: string;
  productId: string;
  productName: string;
  productSlug: string | null;
  enabledVariantIds: string[];
  variants: BillingCatalogVariant[];
  testMode: boolean;
};

export type BillingStatusResponse = SubscriptionState & {
  checkoutEnabled: boolean;
};

export type BillingDashboardSummary = SubscriptionState &
  BillingPortalUrls & {
    hasBillingRecord: boolean;
    lemonSubscriptionId: string | null;
    lemonCustomerId: string | null;
    productId: string | null;
    productName: string | null;
    variantName: string | null;
    planLabel: string;
    statusLabel: string;
    entitlementLabel: string;
    storeBillingUrl: string | null;
    isPaused: boolean;
    pauseMode: string | null;
    pauseResumesAt: string | null;
    renewsAt: string | null;
    endsAt: string | null;
    trialEndsAt: string | null;
    lastPaymentStatus: BillingPaymentStatus | null;
    lastPaymentStatusLabel: string | null;
    lastPaymentAt: string | null;
    lastEventName: string | null;
    lastEventAt: string | null;
  };

export type BillingInvoice = {
  id: string;
  subscriptionId: string | null;
  orderId: string | null;
  number: string | null;
  createdAt: string | null;
  billingReason: string | null;
  billingReasonLabel: string;
  status: string | null;
  statusLabel: string;
  totalFormatted: string | null;
  refunded: boolean;
  refundedAmountFormatted: string | null;
  invoiceUrl: string | null;
};

export type BillingInvoicesResponse = {
  invoices: BillingInvoice[];
};

export type BillingPortalResponse = BillingPortalUrls & {
  fresh: boolean;
  fallback: boolean;
};

export type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown> | null;
  };
  data?: {
    type?: string;
    id?: string;
    attributes?: Record<string, unknown> | null;
  };
};

export type SupportedLemonEventName =
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_resumed"
  | "subscription_expired"
  | "subscription_paused"
  | "subscription_unpaused"
  | "subscription_payment_failed"
  | "subscription_payment_success"
  | "subscription_payment_recovered"
  | "subscription_payment_refunded"
  | "subscription_plan_changed";
