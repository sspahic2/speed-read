import { BillingConfigurationError } from "@/lib/billing/errors";
import {
  getLemonStore,
  getLemonStoreId,
  listLemonProductsForStore,
  listLemonVariantsForProduct,
} from "@/lib/billing/lemonsqueezy-client";
import type { LemonProductResource } from "@/lib/billing/lemonsqueezy-client";
import type { BillingCatalogVariant, PublishedBillingCatalog } from "@/lib/billing/types";
import { coerceString, formatPriceCents, normalizePlanInterval } from "@/lib/billing/utils";

const CATALOG_TTL_MS = 5 * 60 * 1000;

let catalogCache:
  | {
      cacheKey: string;
      expiresAt: number;
      value: PublishedBillingCatalog;
    }
  | null = null;

function selectProduct(products: LemonProductResource[]) {
  const slugSelector = process.env.LEMONSQUEEZY_PRODUCT_SLUG?.trim().toLowerCase();
  const nameSelector = process.env.LEMONSQUEEZY_PRODUCT_NAME?.trim().toLowerCase();

  if (slugSelector) {
    const bySlug = products.find((product) => product.attributes.slug?.toLowerCase() === slugSelector);
    if (bySlug) {
      return bySlug;
    }
  }

  if (nameSelector) {
    const byName = products.find((product) => product.attributes.name.trim().toLowerCase() === nameSelector);
    if (byName) {
      return byName;
    }
  }

  return [...products].sort((left, right) => left.attributes.name.localeCompare(right.attributes.name))[0] ?? null;
}

function normalizeVariants(params: {
  variants: Awaited<ReturnType<typeof listLemonVariantsForProduct>>;
  currency: string;
}) {
  const normalized: BillingCatalogVariant[] = params.variants
    .filter((variant) => variant.attributes.status === "published" && variant.attributes.is_subscription)
    .map((variant) => ({
      variantId: variant.id,
      variantName: variant.attributes.name,
      interval: normalizePlanInterval(variant.attributes.interval),
      price: variant.attributes.price,
      currency: params.currency,
      priceFormatted: formatPriceCents(variant.attributes.price, params.currency),
      sort: variant.attributes.sort,
    }))
    .sort((left, right) => left.sort - right.sort);

  if (normalized.length === 0) {
    throw new BillingConfigurationError(
      "No published subscription variants were found for the configured Lemon Squeezy product.",
      503,
    );
  }

  return normalized;
}

export async function getPublishedBillingCatalog() {
  const storeId = getLemonStoreId();
  const cacheKey = [
    storeId,
    process.env.LEMONSQUEEZY_PRODUCT_SLUG?.trim() ?? "",
    process.env.LEMONSQUEEZY_PRODUCT_NAME?.trim() ?? "",
  ].join(":");

  if (catalogCache && catalogCache.cacheKey === cacheKey && catalogCache.expiresAt > Date.now()) {
    return catalogCache.value;
  }

  const [store, products] = await Promise.all([getLemonStore(storeId), listLemonProductsForStore(storeId)]);

  if (store.id !== storeId) {
    throw new BillingConfigurationError(
      `Configured Lemon Squeezy store ${storeId} did not match the API response.`,
      500,
    );
  }

  const publishedProducts = products.filter(
    (product) =>
      product.attributes.status === "published" &&
      String(product.attributes.store_id) === storeId,
  );

  if (publishedProducts.length === 0) {
    throw new BillingConfigurationError(
      "No published Lemon Squeezy products were found for the configured store.",
      503,
    );
  }

  const selectedProduct = selectProduct(publishedProducts);

  if (!selectedProduct) {
    throw new BillingConfigurationError(
      "Unable to select a published Lemon Squeezy product for billing.",
      503,
    );
  }

  const variants = await listLemonVariantsForProduct(selectedProduct.id);
  const normalizedVariants = normalizeVariants({
    variants: variants.filter(
      (variant) => String(variant.attributes.product_id) === selectedProduct.id,
    ),
    currency: store.attributes.currency,
  });

  const catalog: PublishedBillingCatalog = {
    storeId,
    storeName: store.attributes.name,
    storeSlug: store.attributes.slug,
    storeUrl: store.attributes.url,
    currency: store.attributes.currency,
    productId: selectedProduct.id,
    productName: selectedProduct.attributes.name,
    productSlug: coerceString(selectedProduct.attributes.slug),
    enabledVariantIds: normalizedVariants.map((variant) => variant.variantId),
    variants: normalizedVariants,
    testMode: Boolean(selectedProduct.attributes.test_mode),
  };

  catalogCache = {
    cacheKey,
    expiresAt: Date.now() + CATALOG_TTL_MS,
    value: catalog,
  };

  return catalog;
}

export async function resolveCatalogVariant(params: {
  plan?: "monthly" | "yearly";
  variantId?: string | null;
}) {
  const catalog = await getPublishedBillingCatalog();

  if (params.variantId) {
    const directMatch = catalog.variants.find((variant) => variant.variantId === params.variantId);
    if (!directMatch) {
      throw new BillingConfigurationError("Requested billing variant is not part of the published catalog.", 400);
    }

    return {
      catalog,
      variant: directMatch,
    };
  }

  const preferredInterval = params.plan === "yearly" ? "year" : "month";
  const intervalMatch = catalog.variants.find((variant) => variant.interval === preferredInterval);

  if (!intervalMatch) {
    throw new BillingConfigurationError(
      `No published ${preferredInterval === "year" ? "yearly" : "monthly"} billing variant is currently available.`,
      503,
    );
  }

  return {
    catalog,
    variant: intervalMatch,
  };
}
