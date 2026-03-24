"use client";

import Link from "next/link";
import Script from "next/script";
import { useState } from "react";
import { CreditCard, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BillingPortalResponse } from "@/lib/billing/types";

type BillingActionButtonsProps = {
  hasBillingRecord: boolean;
  isSubscribed: boolean;
  status: string | null;
  updatePaymentMethodUrl: string | null;
};

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

export function BillingActionButtons(props: BillingActionButtonsProps) {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [unsubscribeOpen, setUnsubscribeOpen] = useState(false);
  const [unsubscribeLoading, setUnsubscribeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lemonReady, setLemonReady] = useState(false);

  const isCancelled = props.status === "cancelled" || props.status === "expired";

  async function handleUpdatePayment() {
    setPaymentLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const body = (await response.json().catch(() => ({}))) as BillingPortalResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to prepare payment update.");
      }

      const url = body.updatePaymentMethodUrl ?? props.updatePaymentMethodUrl;

      if (!url) {
        throw new Error("No payment update URL is available.");
      }

      if (lemonReady && window.LemonSqueezy?.Url?.Open) {
        window.LemonSqueezy.Url.Open(url);
      } else {
        window.location.assign(url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open payment update.");
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleUnsubscribe() {
    setUnsubscribeLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const body = (await response.json().catch(() => ({}))) as {
        cancelled?: boolean;
        endsAt?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to cancel subscription.");
      }

      setUnsubscribeOpen(false);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel subscription.");
    } finally {
      setUnsubscribeLoading(false);
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
          variant="outline"
          className="sm:min-w-44"
          disabled={paymentLoading || unsubscribeLoading}
          onClick={handleUpdatePayment}
        >
          {paymentLoading ? "Opening..." : "Update Payment Method"}
          <CreditCard className="size-4" />
        </Button>

        {props.isSubscribed && !isCancelled ? (
          <Button
            variant="destructive"
            className="sm:min-w-36"
            disabled={paymentLoading || unsubscribeLoading}
            onClick={() => setUnsubscribeOpen(true)}
          >
            Unsubscribe
            <XCircle className="size-4" />
          </Button>
        ) : null}

        {!props.isSubscribed ? (
          <Button asChild variant="secondary" className="sm:min-w-32">
            <Link href="/pricing">View Pricing</Link>
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Dialog open={unsubscribeOpen} onOpenChange={setUnsubscribeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription</DialogTitle>
            <DialogDescription>
              Your access will remain active until the end of the current billing period.
              After that, reader access will be deactivated. You can resubscribe at any time
              from the pricing page.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              disabled={unsubscribeLoading}
              onClick={() => setUnsubscribeOpen(false)}
            >
              Keep subscription
            </Button>
            <Button
              variant="destructive"
              disabled={unsubscribeLoading}
              onClick={handleUnsubscribe}
            >
              {unsubscribeLoading ? "Cancelling..." : "Yes, cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
