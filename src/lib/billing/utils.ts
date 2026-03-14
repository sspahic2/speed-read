import { createHash } from "node:crypto";
import type { BillingPlanInterval } from "@/lib/billing/types";

const DIRECT_ACCESS_STATUSES = new Set(["active", "on_trial", "trialing"]);
const PERIOD_END_ACCESS_STATUSES = new Set(["cancelled", "paused", "past_due"]);
const NO_ACCESS_STATUSES = new Set(["expired", "unpaid"]);

export function coerceString(value: unknown) {
  if (typeof value !== "string") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalDate(value: unknown) {
  const input = coerceString(value);
  if (!input) {
    return null;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizePlanInterval(value: unknown): BillingPlanInterval {
  const interval = coerceString(value)?.toLowerCase();

  if (interval === "month" || interval === "monthly") {
    return "month";
  }

  if (interval === "year" || interval === "yearly" || interval === "annual") {
    return "year";
  }

  return "unknown";
}

export function formatPriceCents(amount: number, currency: string) {
  const normalizedCurrency = currency.toUpperCase();

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
  }).format(amount / 100);
}

// Cancellation, pause, and past-due states keep access until the paid-through
// period ends when Lemon Squeezy sends an `ends_at` timestamp.
export function computeEntitlementActive(params: {
  status: string | null | undefined;
  endsAt?: Date | null;
}) {
  const status = params.status?.toLowerCase() ?? "";
  const endsAt = params.endsAt ?? null;

  if (!status || NO_ACCESS_STATUSES.has(status)) {
    return false;
  }

  if (DIRECT_ACCESS_STATUSES.has(status)) {
    return !endsAt || endsAt.getTime() > Date.now();
  }

  if (PERIOD_END_ACCESS_STATUSES.has(status)) {
    return Boolean(endsAt && endsAt.getTime() > Date.now());
  }

  return false;
}

export function createWebhookIdempotencyKey(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
