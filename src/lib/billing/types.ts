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
