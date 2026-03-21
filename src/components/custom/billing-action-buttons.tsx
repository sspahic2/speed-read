"use client";

import Link from "next/link";
import Script from "next/script";
import { useState } from "react";
import { ArrowUpRight, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BillingPortalResponse } from "@/lib/billing/types";

type BillingActionButtonsProps = {
  hasBillingRecord: boolean;
  isSubscribed: boolean;
  customerPortalUrl: string | null;
  updatePaymentMethodUrl: string | null;
  updateSubscriptionUrl: string | null;
  storeBillingUrl: string | null;
};

type BillingAction = "manage" | "payment" | "change";

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url?: {
        Open: (url: string) => void;
      };
    };
  }
}

function getFallbackUrl(
  action: BillingAction,
  props: BillingActionButtonsProps,
  portalResponse?: BillingPortalResponse,
) {
  switch (action) {
    case "manage":
      return (
        portalResponse?.customerPortalUrl ??
        props.customerPortalUrl ??
        props.storeBillingUrl
      );
    case "payment":
      return (
        portalResponse?.updatePaymentMethodUrl ??
        props.updatePaymentMethodUrl
      );
    case "change":
      return (
        portalResponse?.updateSubscriptionUrl ??
        portalResponse?.customerPortalUrl ??
        props.updateSubscriptionUrl ??
        props.customerPortalUrl ??
        props.storeBillingUrl
      );
    default:
      return null;
  }
}

export function BillingActionButtons(props: BillingActionButtonsProps) {
  const [activeAction, setActiveAction] = useState<BillingAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lemonReady, setLemonReady] = useState(false);

  async function requestFreshPortalUrls() {
    const response = await fetch("/api/billing/portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const body = (await response.json().catch(() => ({}))) as BillingPortalResponse & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(body.error ?? "Unable to prepare billing actions.");
    }

    return body;
  }

  async function handleAction(action: BillingAction) {
    setActiveAction(action);
    setError(null);

    try {
      const portalResponse = await requestFreshPortalUrls();
      const nextUrl = getFallbackUrl(action, props, portalResponse);

      if (!nextUrl) {
        throw new Error("No billing URL is available for that action.");
      }

      if (action === "payment" && lemonReady && window.LemonSqueezy?.Url?.Open) {
        window.LemonSqueezy.Url.Open(nextUrl);
        return;
      }

      window.location.assign(nextUrl);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to open the billing action.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  if (!props.hasBillingRecord) {
    return (
      <div className="space-y-3">
        <Button asChild className="w-full sm:w-auto">
          <Link href="/pricing">View Pricing</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Your subscription summary, invoices, and billing actions will appear here after checkout.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Script
        src="https://app.lemonsqueezy.com/js/lemon.js"
        strategy="afterInteractive"
        onReady={() => {
          setLemonReady(true);
          window.createLemonSqueezy?.();
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          className="sm:min-w-44"
          disabled={activeAction !== null}
          onClick={() => void handleAction("manage")}
        >
          {activeAction === "manage" ? "Opening..." : "Manage Billing"}
          <ArrowUpRight className="size-4" />
        </Button>

        <Button
          variant="outline"
          className="sm:min-w-44"
          disabled={activeAction !== null}
          onClick={() => void handleAction("payment")}
        >
          {activeAction === "payment" ? "Opening..." : "Update Payment Method"}
          <CreditCard className="size-4" />
        </Button>

        <Button
          variant="outline"
          className="sm:min-w-36"
          disabled={activeAction !== null}
          onClick={() => void handleAction("change")}
        >
          {activeAction === "change" ? "Opening..." : "Change Plan"}
          <RefreshCw className="size-4" />
        </Button>

        {!props.isSubscribed ? (
          <Button asChild variant="secondary" className="sm:min-w-32">
            <Link href="/pricing">View Pricing</Link>
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="text-sm text-muted-foreground">
        Billing actions open Lemon Squeezy hosted pages. Payment method updates use Lemon.js when
        the overlay script is available, and fall back to a standard redirect otherwise.
      </p>
    </div>
  );
}
