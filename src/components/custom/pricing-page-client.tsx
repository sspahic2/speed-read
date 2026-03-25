"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { trackPixelEvent } from "@/components/meta-pixel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  BillingCatalogVariant,
  BillingStatusResponse,
  PublishedBillingCatalog,
} from "@/lib/billing/types";

function formatInterval(interval: BillingCatalogVariant["interval"]) {
  switch (interval) {
    case "month":
      return "/ month";
    case "year":
      return "/ year";
    default:
      return "";
  }
}

function formatTrial(variant: BillingCatalogVariant) {
  if (!variant.hasFreeTrial || !variant.trialIntervalCount) return null;
  const unit = variant.trialInterval ?? "day";
  const count = variant.trialIntervalCount;
  return `${count} ${unit}${count > 1 ? "s" : ""} free trial`;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

const FEATURES = [
  "Unlimited PDF & EPUB uploads",
  "RSVP speed reading engine",
  "Reading progress sync",
  "Full library management",
];

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
        if (cancelled) return;

        setCatalog(nextCatalog);

        if (statusResponse) {
          if (!statusResponse.ok) {
            const body = (await statusResponse.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? "Unable to load billing status.");
          }

          const nextStatus = (await statusResponse.json()) as BillingStatusResponse;
          if (!cancelled) setBillingStatus(nextStatus);
        } else {
          setBillingStatus(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load billing data.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadBillingContext();
    return () => { cancelled = true; };
  }, [sessionStatus]);

  const isAuthenticated = sessionStatus === "authenticated";
  const isSubscribed = billingStatus?.isSubscribed ?? Boolean(session?.user?.isSubscribed);
  const currentVariantId = billingStatus?.variantId ?? null;
  const variants = catalog?.variants ?? [];
  const productName = catalog?.productName ?? null;
  const productImageUrl = catalog?.productImageUrl ?? null;

  async function handleCheckout(variantId: string) {
    setCheckoutVariantId(variantId);
    setError(null);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !body.checkoutUrl) {
        throw new Error(body.error ?? "Unable to start checkout.");
      }

      trackPixelEvent("InitiateCheckout");
      window.location.assign(body.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.");
    } finally {
      setCheckoutVariantId(null);
    }
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_42%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--background)/0.78),hsl(var(--background)))]">
      <div className="mx-auto flex max-w-5xl flex-col px-4 py-10 sm:px-6 md:py-20">

        {/* Hero */}
        <section className="flex flex-col items-center gap-5 text-center sm:gap-6">
          <Badge variant="outline" className="rounded-full px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] sm:text-xs">
            Pricing
          </Badge>

          <h1 className="max-w-lg text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Read faster. Retain more.
          </h1>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:max-w-xl sm:text-base md:text-lg">
            Pick a plan to unlock the full speed reading experience.
          </p>

          {isSubscribed ? (
            <div className="flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 sm:px-5 sm:py-2.5">
              <Check className="size-3.5 text-primary sm:size-4" />
              <span className="text-xs font-medium sm:text-sm">You&apos;re subscribed</span>
              <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-0.5 text-xs sm:text-sm">
                <Link href="/billing">Manage</Link>
              </Button>
            </div>
          ) : null}
        </section>

        {/* Product image */}
        {productImageUrl ? (
          <div className="relative mx-auto mt-10 aspect-[3/2] w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 shadow-lg sm:mt-14 sm:rounded-3xl">
            <Image
              src={productImageUrl}
              alt={productName ?? "Product"}
              fill
              className="object-cover"
              sizes="(max-width: 640px) calc(100vw - 2rem), 672px"
              priority
            />
          </div>
        ) : null}

        {/* Error */}
        {error ? (
          <div className="mt-10 rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-3.5 text-center text-sm text-destructive sm:rounded-2xl sm:px-6 sm:py-4">
            {error}
          </div>
        ) : null}

        {/* Plans */}
        <section className="mt-12 sm:mt-16">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground sm:py-20">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading plans...</span>
            </div>
          ) : variants.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground sm:py-20">
              No plans are currently published.
            </p>
          ) : (
            <div
              className={`mx-auto grid gap-5 sm:gap-6 ${
                variants.length === 1
                  ? "max-w-sm sm:max-w-md"
                  : variants.length === 2
                    ? "max-w-3xl sm:grid-cols-2"
                    : "sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {variants.map((variant, index) => (
                <PlanCard
                  key={variant.variantId}
                  variant={variant}
                  highlight={variants.length > 1 && index === variants.length - 1}
                  isAuthenticated={isAuthenticated}
                  isSubscribed={isSubscribed}
                  isCurrentPlan={currentVariantId === variant.variantId}
                  isSubmitting={checkoutVariantId === variant.variantId}
                  anySubmitting={checkoutVariantId !== null}
                  onCheckout={handleCheckout}
                  onSignIn={() => signIn("google", { callbackUrl: "/pricing" })}
                />
              ))}
            </div>
          )}
        </section>

        {/* Sign-in prompt */}
        {!isAuthenticated && !isLoading ? (
          <section className="mt-12 flex flex-col items-center gap-3 text-center sm:mt-16 sm:gap-4">
            <p className="text-xs text-muted-foreground sm:text-sm">
              Sign in with Google to get started.
            </p>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-6 text-sm sm:px-8"
              onClick={() => signIn("google", { callbackUrl: "/pricing" })}
            >
              Continue with Google
              <ArrowRight className="size-4" />
            </Button>
          </section>
        ) : null}
      </div>
    </main>
  );
}

type PlanCardProps = {
  variant: BillingCatalogVariant;
  highlight: boolean;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  isCurrentPlan: boolean;
  isSubmitting: boolean;
  anySubmitting: boolean;
  onCheckout: (variantId: string) => void;
  onSignIn: () => void;
};

function PlanCard(props: PlanCardProps) {
  const { variant, highlight } = props;
  const trial = formatTrial(variant);
  const description = variant.description ? stripHtml(variant.description) : null;

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-card/80 shadow-sm transition-shadow hover:shadow-md sm:rounded-3xl ${
        highlight
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border/70"
      }`}
    >
      {highlight ? (
        <div className="flex items-center justify-center gap-1.5 bg-primary py-1.5 text-[0.65rem] font-medium uppercase tracking-widest text-primary-foreground sm:py-2 sm:text-xs">
          <Sparkles className="size-3 sm:size-3.5" />
          Best value
        </div>
      ) : null}

      <div className="flex flex-1 flex-col px-5 py-6 sm:px-7 sm:py-8">
        {/* Header */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold sm:text-lg">{variant.variantName}</h3>
            {props.isCurrentPlan ? (
              <Badge variant="secondary" className="text-[0.6rem] sm:text-[0.65rem]">Current</Badge>
            ) : null}
          </div>
          {description ? (
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
          ) : null}
        </div>

        {/* Price */}
        <div className="mt-5 flex items-baseline gap-1 sm:mt-6 sm:gap-1.5">
          <span className="text-3xl font-bold tracking-tight sm:text-4xl">{variant.priceFormatted}</span>
          <span className="text-xs text-muted-foreground sm:text-sm">{formatInterval(variant.interval)}</span>
        </div>

        {trial ? (
          <p className="mt-1.5 text-xs font-medium text-primary sm:mt-2 sm:text-sm">{trial} included</p>
        ) : null}

        <Separator className="my-5 sm:my-6" />

        {/* Features */}
        <ul className="flex-1 space-y-2.5 sm:space-y-3">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs sm:gap-2.5 sm:text-sm">
              <Check className="mt-0.5 size-3.5 shrink-0 text-primary sm:size-4" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-6 sm:mt-8">
          {props.isAuthenticated ? (
            <Button
              className="w-full rounded-xl py-4 text-sm sm:py-5"
              variant={highlight ? "default" : "outline"}
              disabled={props.isSubscribed || props.anySubmitting}
              onClick={() => void props.onCheckout(variant.variantId)}
            >
              {props.isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Redirecting...
                </>
              ) : props.isSubscribed ? (
                props.isCurrentPlan ? "Current plan" : "Already subscribed"
              ) : (
                <>
                  Get started
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              className="w-full rounded-xl py-4 text-sm sm:py-5"
              variant={highlight ? "default" : "outline"}
              onClick={props.onSignIn}
            >
              Sign in to subscribe
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
