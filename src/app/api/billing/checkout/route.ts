import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { BillingConfigurationError, BillingError } from "@/lib/billing/errors";
import { getAppUrl, lemonsqueezyRequest } from "@/lib/billing/lemonsqueezy-client";
import { resolveCatalogVariant } from "@/lib/billing/lemonsqueezy-catalog";
import { getAccountForUserId } from "@/lib/billing/subscription-state";
import { stripTrailingSlash } from "@/lib/billing/utils";

const log = createLogger("api.billing.checkout");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutRequestBody = {
  plan?: "monthly" | "yearly";
  variantId?: string;
};

type LemonCheckoutResponse = {
  data?: {
    attributes?: {
      url?: string;
    };
  };
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as CheckoutRequestBody;
    const [account, selectedCatalogVariant] = await Promise.all([
      getAccountForUserId(session.user.id),
      resolveCatalogVariant({
        plan: body.plan,
        variantId: body.variantId ?? null,
      }),
    ]);

    if (!account) {
      throw new BillingConfigurationError("Unable to resolve a billing account for the current user.", 404);
    }

    const appUrl = stripTrailingSlash(getAppUrl());
    const response = await lemonsqueezyRequest<LemonCheckoutResponse>("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: session.user.email ?? undefined,
              name: session.user.name ?? undefined,
              custom: {
                account_id: account.id,
                user_id: session.user.id,
              },
            },
            checkout_options: {
              embed: false,
            },
            product_options: {
              enabled_variants: selectedCatalogVariant.catalog.enabledVariantIds,
              redirect_url: `${appUrl}/pricing?checkout=success`,
              receipt_button_text: "Manage billing",
              receipt_link_url: `${selectedCatalogVariant.catalog.storeUrl}/billing`,
            },
            test_mode: selectedCatalogVariant.catalog.testMode,
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: selectedCatalogVariant.catalog.storeId,
              },
            },
            variant: {
              data: {
                type: "variants",
                id: selectedCatalogVariant.variant.variantId,
              },
            },
          },
        },
      }),
    });

    const checkoutUrl = response.data?.attributes?.url;
    if (!checkoutUrl) {
      log.error("Lemon Squeezy returned no checkout URL", { userId: session.user.id });
      throw new BillingConfigurationError("Lemon Squeezy did not return a checkout URL.", 502);
    }

    log.info("Checkout session created", {
      userId: session.user.id,
      variantId: selectedCatalogVariant.variant.variantId,
    });
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    if (error instanceof BillingError) {
      log.error("Checkout creation failed", {
        userId: session.user.id,
        error: error.message,
        statusCode: error.statusCode,
      });
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : "Failed to create checkout.";
    log.error("Unexpected checkout failure", { userId: session.user.id, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
