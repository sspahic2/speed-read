import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { format } from "date-fns";
import { AlertTriangle, ArrowUpRight, ReceiptText, ShieldCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { BillingActionButtons } from "@/components/custom/billing-action-buttons";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBillingDashboardPageDataForUser } from "@/lib/billing/customer-dashboard";
import type { BillingDashboardSummary, BillingInvoice } from "@/lib/billing/types";

export const dynamic = "force-dynamic";

function formatDisplayDate(value: string | null, pattern = "PPP") {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not scheduled";
  }

  return format(parsed, pattern);
}

function formatInvoiceDate(value: string | null) {
  return formatDisplayDate(value, "PPP");
}

function getStatusBadgeVariant(summary: BillingDashboardSummary): BadgeProps["variant"] {
  const status = summary.status?.toLowerCase() ?? "";

  if (summary.isSubscribed || status === "active" || status === "on_trial" || status === "trialing") {
    return "default";
  }

  if (status === "past_due" || summary.lastPaymentStatus === "failed") {
    return "destructive";
  }

  if (status === "cancelled" || status === "paused") {
    return "secondary";
  }

  return "outline";
}

function getPaymentBadgeVariant(summary: BillingDashboardSummary): BadgeProps["variant"] {
  switch (summary.lastPaymentStatus) {
    case "failed":
      return "destructive";
    case "success":
    case "recovered":
      return "default";
    case "refunded":
      return "secondary";
    default:
      return "outline";
  }
}

function getSubscriptionHeadline(summary: BillingDashboardSummary) {
  if (!summary.hasBillingRecord) {
    return "No active subscription on file.";
  }

  if (summary.status === "cancelled" && summary.endsAt) {
    return `Cancellation recorded. Access remains active until ${formatDisplayDate(summary.endsAt)}.`;
  }

  if (summary.isPaused) {
    const resumeDate = summary.pauseResumesAt ? formatDisplayDate(summary.pauseResumesAt) : "a future billing date";
    return `Billing is paused${summary.pauseMode ? ` in ${summary.pauseMode} mode` : ""} and resumes on ${resumeDate}.`;
  }

  if (summary.lastPaymentStatus === "failed") {
    return "Your most recent payment needs attention. Update the payment method to avoid losing access.";
  }

  return summary.isSubscribed
    ? "Your reader entitlement is active and synced from Lemon Squeezy webhooks."
    : "Your billing record is available, but reader access is currently inactive.";
}

function getProductLabel(summary: BillingDashboardSummary) {
  const parts = [summary.productName, summary.variantName].filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : "Subscription on file";
}

function SummaryDetail(props: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-2xl border border-border/60 bg-background/55 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{props.label}</p>
      <p className="text-sm font-medium text-foreground">{props.value}</p>
    </div>
  );
}

function LifecycleRow(props: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <p className="text-sm text-muted-foreground">{props.label}</p>
      <p className={props.emphasize ? "text-sm font-medium text-foreground" : "text-sm text-foreground"}>
        {props.value}
      </p>
    </div>
  );
}

function InvoiceRow(props: { invoice: BillingInvoice }) {
  const { invoice } = props;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{invoice.billingReasonLabel}</p>
          <Badge variant="outline">{invoice.statusLabel}</Badge>
          {invoice.refunded ? <Badge variant="secondary">Refunded</Badge> : null}
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {formatInvoiceDate(invoice.createdAt)}
          {invoice.number ? `  |  Invoice ${invoice.number}` : ""}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:min-w-72">
        <div className="space-y-1 sm:text-right">
          <p className="text-sm font-semibold text-foreground">
            {invoice.totalFormatted ?? "Amount unavailable"}
          </p>
          {invoice.refundedAmountFormatted ? (
            <p className="text-xs text-muted-foreground">Refunded {invoice.refundedAmountFormatted}</p>
          ) : null}
        </div>

        {invoice.invoiceUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer">
              View Invoice
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { summary, invoices, invoiceError } = await getBillingDashboardPageDataForUser(session.user.id);
  const userLabel = session.user.name ?? session.user.email ?? "your account";

  return (
    <main className="bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_42%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--background)/0.78),hsl(var(--background)))]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <section className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 px-6 py-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge
                variant="outline"
                className="rounded-md px-3 py-1 text-xs uppercase tracking-[0.2em]"
              >
                Billing
              </Badge>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight">Billing dashboard</h1>
                <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                  Review your current subscription state, lifecycle dates, and invoice history here.
                  Billing actions stay hosted by Lemon Squeezy so payment methods, billing details, and
                  plan changes remain on their secure checkout surfaces.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/65 px-4 py-4 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Signed in as
              </p>
              <p className="font-medium text-foreground">{userLabel}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={getStatusBadgeVariant(summary)}>{summary.statusLabel}</Badge>
                <Badge variant={summary.isSubscribed ? "default" : "secondary"}>
                  {summary.planLabel}
                </Badge>
                <Badge variant={summary.isSubscribed ? "default" : "outline"}>
                  {summary.entitlementLabel}
                </Badge>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border/70 bg-card/80">
            <CardHeader className="space-y-3">
              <CardTitle>Subscription summary</CardTitle>
              <CardDescription>{getSubscriptionHeadline(summary)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SummaryDetail label="Plan" value={summary.planLabel} />
              <SummaryDetail label="Product" value={getProductLabel(summary)} />
              <SummaryDetail label="Status" value={summary.statusLabel} />
              <SummaryDetail label="Access" value={summary.entitlementLabel} />
              <SummaryDetail
                label="Last billing sync"
                value={
                  summary.lastEventAt
                    ? `${summary.lastEventName ? `${summary.lastEventName} on ` : ""}${formatDisplayDate(summary.lastEventAt, "PPP 'at' p")}`
                    : "No webhook event recorded yet"
                }
              />
              <SummaryDetail
                label="Portal availability"
                value={summary.hasBillingRecord ? "Ready from fresh signed links" : "Available after checkout"}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader className="space-y-3">
              <CardTitle>Billing actions</CardTitle>
              <CardDescription>
                Open the hosted Lemon Squeezy billing flows without exposing payment forms inside the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <BillingActionButtons
                hasBillingRecord={summary.hasBillingRecord}
                isSubscribed={summary.isSubscribed}
                customerPortalUrl={summary.customerPortalUrl}
                updatePaymentMethodUrl={summary.updatePaymentMethodUrl}
                updateSubscriptionUrl={summary.updateSubscriptionUrl}
                storeBillingUrl={summary.storeBillingUrl}
              />

              <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-4 text-primary" />
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Lemon Squeezy remains the source for payment methods, tax details, cancellations,
                      and plan switching.
                    </p>
                    <p>
                      If anything looks wrong, check the portal first or contact support from{" "}
                      <Link className="text-foreground underline underline-offset-4" href="/terms-and-conditions#contact">
                        the terms page
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>Lifecycle</CardTitle>
              <CardDescription>
                Renewal, trial, pause, and access-end dates come from your local billing snapshot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LifecycleRow label="Next renewal" value={formatDisplayDate(summary.renewsAt)} />
              <LifecycleRow label="Trial ends" value={formatDisplayDate(summary.trialEndsAt)} />
              <LifecycleRow
                label="Access ends"
                value={formatDisplayDate(summary.endsAt)}
                emphasize={Boolean(summary.endsAt)}
              />
              <LifecycleRow
                label="Pause resume"
                value={
                  summary.isPaused
                    ? `${summary.pauseMode ? `${summary.pauseMode} - ` : ""}${formatDisplayDate(summary.pauseResumesAt)}`
                    : "Not paused"
                }
              />
              <LifecycleRow
                label="Customer portal"
                value={summary.customerPortalUrl || summary.storeBillingUrl ? "Available" : "Unavailable"}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>Payment health</CardTitle>
              <CardDescription>
                Keep an eye on the latest payment state so entitlement changes do not surprise the user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getPaymentBadgeVariant(summary)}>
                  {summary.lastPaymentStatusLabel ?? "No payment event yet"}
                </Badge>
                {summary.lastPaymentAt ? (
                  <span className="text-sm text-muted-foreground">
                    {formatDisplayDate(summary.lastPaymentAt, "PPP 'at' p")}
                  </span>
                ) : null}
              </div>

              {summary.lastPaymentStatus === "failed" ? (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                  Update your payment method now. Lemon Squeezy reported a failed payment, and access may
                  lapse once the paid-through period ends.
                </div>
              ) : summary.lastPaymentStatus === "refunded" ? (
                <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-4 text-sm text-muted-foreground">
                  The latest invoice shows a refund. Review the invoice history below if you need the exact
                  document and amount.
                </div>
              ) : summary.hasBillingRecord ? (
                <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-4 text-sm text-muted-foreground">
                  The latest payment state on file is{" "}
                  <span className="font-medium text-foreground">
                    {summary.lastPaymentStatusLabel ?? "not yet recorded"}
                  </span>
                  .
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-4 text-sm text-muted-foreground">
                  Start a subscription to populate payment health and invoice history.
                </div>
              )}

              {!summary.hasBillingRecord ? (
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <Card className="border-border/70 bg-card/80">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="size-5 text-primary" />
                Invoice history
              </CardTitle>
              <CardDescription>
                Charges are listed here in-app, while invoice files stay hosted by Lemon Squeezy.
              </CardDescription>
            </div>

            {summary.hasBillingRecord ? (
              <p className="text-sm text-muted-foreground">
                {invoices.length} invoice{invoices.length === 1 ? "" : "s"} loaded
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {invoiceError ? (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>{invoiceError}</p>
              </div>
            ) : null}

            {!summary.hasBillingRecord ? (
              <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-5 text-sm text-muted-foreground">
                No invoices yet. Once a subscription is created, this page will list each initial charge,
                renewal, and invoice document link.
              </div>
            ) : invoices.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-5 text-sm text-muted-foreground">
                Lemon Squeezy has not returned any subscription invoices yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-background/45">
                {invoices.map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
