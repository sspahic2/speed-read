import { BillingConfigurationError } from "@/lib/billing/errors";

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

type JsonApiListResponse<T> = {
  data: T[];
  links?: {
    next?: string | null;
  };
};

type JsonApiDocumentResponse<T> = {
  data: T;
};

export type LemonStoreResource = {
  id: string;
  type: "stores";
  attributes: {
    name: string;
    slug: string;
    url: string;
    currency: string;
  };
};

export type LemonProductResource = {
  id: string;
  type: "products";
  attributes: {
    store_id: number;
    name: string;
    slug?: string | null;
    status: string;
    test_mode: boolean;
  };
};

export type LemonVariantResource = {
  id: string;
  type: "variants";
  attributes: {
    product_id: number;
    name: string;
    status: string;
    price: number;
    interval?: string | null;
    is_subscription: boolean;
    sort: number;
  };
};

export type LemonSubscriptionResource = {
  id: string;
  type: "subscriptions";
  attributes: {
    store_id: number;
    customer_id?: number | null;
    order_id?: number | null;
    product_id?: number | null;
    variant_id?: number | null;
    product_name?: string | null;
    variant_name?: string | null;
    status: string;
    test_mode: boolean;
    renews_at?: string | null;
    ends_at?: string | null;
    trial_ends_at?: string | null;
    urls?: Record<string, unknown> | null;
  };
};

export type LemonSubscriptionInvoiceResource = {
  id: string;
  type: "subscription-invoices";
  attributes: {
    subscription_id?: number | null;
    order_id?: number | null;
    number?: string | null;
    billing_reason?: string | null;
    currency?: string | null;
    status?: string | null;
    status_formatted?: string | null;
    refunded?: boolean | null;
    refunded_amount?: number | null;
    refunded_amount_formatted?: string | null;
    total?: number | null;
    total_formatted?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    urls?: Record<string, unknown> | null;
  };
};

function getRequiredEnv(name: string, fallbacks: string[] = []) {
  const candidateNames = [name, ...fallbacks];

  for (const candidate of candidateNames) {
    const value = process.env[candidate]?.trim();
    if (value) {
      return value;
    }
  }

  throw new BillingConfigurationError(
    `Missing required billing environment variable: ${name}.`,
    500,
  );
}

export function getLemonApiKey() {
  return getRequiredEnv("LEMONSQUEEZY_API_KEY", ["LEMON_SQUEEZY_API"]);
}

export function getLemonStoreId() {
  return getRequiredEnv("LEMONSQUEEZY_STORE_ID");
}

export function getAppUrl() {
  return getRequiredEnv("APP_URL", ["NEXTAUTH_URL"]);
}

function buildLemonUrl(pathOrUrl: string) {
  return pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${LEMONSQUEEZY_API_BASE}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function buildHeaders(initHeaders?: HeadersInit, hasBody?: boolean) {
  const headers = new Headers(initHeaders);

  headers.set("Accept", "application/vnd.api+json");
  headers.set("Authorization", `Bearer ${getLemonApiKey()}`);

  if (hasBody) {
    headers.set("Content-Type", "application/vnd.api+json");
  }

  return headers;
}

function summarizeApiErrorBody(body: string) {
  return body.trim().slice(0, 200);
}

export async function lemonsqueezyRequest<T>(pathOrUrl: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(buildLemonUrl(pathOrUrl), {
    ...init,
    cache: "no-store",
    headers: buildHeaders(init.headers, Boolean(init.body)),
  });

  if (!response.ok) {
    const message = summarizeApiErrorBody(await response.text());
    throw new BillingConfigurationError(
      `Lemon Squeezy API request failed with status ${response.status}.${message ? ` ${message}` : ""}`,
      response.status >= 500 ? 502 : 500,
    );
  }

  return (await response.json()) as T;
}

async function listJsonApiResources<T>(path: string) {
  const items: T[] = [];
  let nextUrl: string | null = path;

  while (nextUrl) {
    const page: JsonApiListResponse<T> = await lemonsqueezyRequest<JsonApiListResponse<T>>(nextUrl);
    items.push(...page.data);
    nextUrl = page.links?.next ?? null;
  }

  return items;
}

export async function getLemonStore(storeId = getLemonStoreId()) {
  const response = await lemonsqueezyRequest<JsonApiDocumentResponse<LemonStoreResource>>(
    `/stores/${encodeURIComponent(storeId)}`,
  );

  return response.data;
}

export async function listLemonProductsForStore(storeId = getLemonStoreId()) {
  return listJsonApiResources<LemonProductResource>(
    `/products?filter[store_id]=${encodeURIComponent(storeId)}&page[size]=100`,
  );
}

export async function listLemonVariantsForProduct(productId: string) {
  return listJsonApiResources<LemonVariantResource>(
    `/variants?filter[product_id]=${encodeURIComponent(productId)}&page[size]=100`,
  );
}

export async function getLemonSubscription(subscriptionId: string) {
  const response = await lemonsqueezyRequest<JsonApiDocumentResponse<LemonSubscriptionResource>>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );

  return response.data;
}

export async function listLemonSubscriptionInvoices(subscriptionId: string) {
  return listJsonApiResources<LemonSubscriptionInvoiceResource>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/subscription-invoices?page[size]=100`,
  );
}
