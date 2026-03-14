"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  BillingCatalogVariant,
  BillingStatusResponse,
  PublishedBillingCatalog,
} from "@/lib/billing/types";

function findPlan(catalog: PublishedBillingCatalog | null, interval: BillingCatalogVariant["interval"]) {
  return catalog?.variants.find((variant) => variant.interval === interval) ?? null;
}

function describePlan(variant: BillingCatalogVariant | null) {
  if (!variant) {
    return "Currently unavailable";
  }

  return variant.interval === "year" ? "Best value for regular use" : "Flexible monthly access";
}

export function PricingPageClient() {
  const { data: session, status: sessionStatus } = useSession();
  const [catalog, setCatalog] = useState<PublishedBillingCatalog | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutVariantId, setCheckoutVariantId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBillingContext() {
      setIsLoading(true);
      setError(null);

      try {
        const requests: Promise<Response>[] = [fetch("/api/billing/catalog", { cache: "no-store" })];
        const shouldLoadStatus = sessionStatus === "authenticated";

        if (shouldLoadStatus) {
          requests.push(fetch("/api/billing/status", { cache: "no-store" }));
        }

        const [catalogResponse, statusResponse] = await Promise.all(requests);

        if (!catalogResponse.ok) {
          const body = (await catalogResponse.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Unable to load billing catalog.");
        }

        const nextCatalog = (await catalogResponse.json()) as PublishedBillingCatalog;
        if (cancelled) {
          return;
        }

        setCatalog(nextCatalog);

        if (statusResponse) {
          if (!statusResponse.ok) {
            const body = (await statusResponse.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? "Unable to load billing status.");
          }

          const nextStatus = (await statusResponse.json()) as BillingStatusResponse;
          if (!cancelled) {
            setBillingStatus(nextStatus);
          }
        } else {
          setBillingStatus(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load billing data.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadBillingContext();

    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  const isAuthenticated = sessionStatus === "authenticated";
  const isSubscribed = billingStatus?.isSubscribed ?? Boolean(session?.user?.isSubscribed);
  const currentPlanInterval = billingStatus?.planInterval ?? session?.user?.planInterval ?? "unknown";
  const monthlyPlan = findPlan(catalog, "month");
  const yearlyPlan = findPlan(catalog, "year");
  const storeBillingUrl = catalog ? `${catalog.storeUrl}/billing` : "/pricing";
  const manageBillingUrl = billingStatus?.customerPortalUrl ?? storeBillingUrl;

  async function handleCheckout(variantId: string) {
    setCheckoutVariantId(variantId);
    setError(null);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ variantId }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !body.checkoutUrl) {
        throw new Error(body.error ?? "Unable to start checkout.");
      }

      window.location.assign(body.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.");
    } finally {
      setCheckoutVariantId(null);
    }
  }

  return (
    <main className="bg-linear-to-b from-background via-background/70 to-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="rounded-2xl border border-border/70 bg-card/80 px-6 py-10 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge variant="outline" className="rounded-md px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Pricing
              </Badge>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight">Unlock the full reader workflow.</h1>
                <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                  Checkout prices come directly from your published Lemon Squeezy catalog. Pick a plan,
                  keep the other option visible in checkout, and let the webhook state drive reader access.
                </p>
              </div>
            </div>

            {isAuthenticated ? (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-4 text-sm">
                <Badge variant={isSubscribed ? "default" : "secondary"}>
                  {isSubscribed ? `Subscribed · ${currentPlanInterval}` : "Not subscribed"}
                </Badge>
                <p className="text-muted-foreground">
                  {isSubscribed
                    ? "Your account has reader access enabled."
                    : "Start a plan to enable uploads, billing sync, and reader access."}
                </p>
                {isSubscribed ? (
                  <Button asChild variant="outline">
                    <a href={manageBillingUrl} target="_blank" rel="noreferrer">
                      Manage Billing
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="px-6 py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <section className="grid gap-6 md:grid-cols-2">
          <PlanCard
            title="Monthly"
            variant={monthlyPlan}
            isLoading={isLoading}
            isAuthenticated={isAuthenticated}
            isSubscribed={isSubscribed}
            isCurrentPlan={currentPlanInterval === "month"}
            isSubmitting={checkoutVariantId === monthlyPlan?.variantId}
            onCheckout={handleCheckout}
          />
          <PlanCard
            title="Yearly"
            variant={yearlyPlan}
            isLoading={isLoading}
            isAuthenticated={isAuthenticated}
            isSubscribed={isSubscribed}
            isCurrentPlan={currentPlanInterval === "year"}
            isSubmitting={checkoutVariantId === yearlyPlan?.variantId}
            onCheckout={handleCheckout}
          />
        </section>

        {!isAuthenticated ? (
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>Need an account first?</CardTitle>
              <CardDescription>
                Sign in with Google so checkout can link the purchase to your account and webhook updates can
                flow back into the app.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => signIn("google", { callbackUrl: "/pricing" })}>Continue with Google</Button>
            </CardFooter>
          </Card>
        ) : null}

        <footer className="border-t border-border/70 pt-6 text-sm text-muted-foreground">
          <p>
            Reader access is enforced by the billing entitlement flag. If your subscription changes, the
            next webhook update becomes the source of truth for this page and the reader gate.
          </p>
        </footer>
      </div>
    </main>
  );
}

type PlanCardProps = {
  title: string;
  variant: BillingCatalogVariant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  isCurrentPlan: boolean;
  isSubmitting: boolean;
  onCheckout: (variantId: string) => void;
};

function PlanCard(props: PlanCardProps) {
  const buttonDisabled = props.isLoading || !props.variant || props.isSubscribed || props.isSubmitting;

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{props.title}</CardTitle>
            <CardDescription>{describePlan(props.variant)}</CardDescription>
          </div>
          {props.isCurrentPlan ? <Badge>Current plan</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {props.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading plan details...</p>
        ) : props.variant ? (
          <>
            <div>
              <p className="text-3xl font-semibold tracking-tight">{props.variant.priceFormatted}</p>
              <p className="text-sm text-muted-foreground">
                {props.variant.interval === "year" ? "per year" : "per month"}
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Published Lemon Squeezy variant: {props.variant.variantName}</p>
              <p>Checkout preselects this option while leaving the other published variant available.</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">This plan is not currently published in Lemon Squeezy.</p>
        )}
      </CardContent>
      <CardFooter>
        {props.isAuthenticated ? (
          <Button
            className="w-full"
            disabled={buttonDisabled}
            onClick={() => {
              if (props.variant) {
                void props.onCheckout(props.variant.variantId);
              }
            }}
          >
            {props.isSubscribed
              ? props.isCurrentPlan
                ? "Current plan"
                : "Subscribed"
              : props.isSubmitting
                ? "Redirecting..."
                : `Choose ${props.title}`}
          </Button>
        ) : (
          <Button className="w-full" asChild>
            <Link href="/login">Log in to continue</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
