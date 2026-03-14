DO $$
BEGIN
    CREATE TYPE "BillingPlanInterval" AS ENUM ('month', 'year', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "BillingPaymentStatus" AS ENUM ('failed', 'success', 'recovered', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Billing" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "lemonSubscriptionId" TEXT NOT NULL,
    "lemonCustomerId" TEXT,
    "status" TEXT NOT NULL,
    "entitlementActive" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT,
    "variantId" TEXT,
    "planInterval" "BillingPlanInterval" NOT NULL DEFAULT 'unknown',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pauseMode" TEXT,
    "pauseResumesAt" TIMESTAMP(3),
    "renewsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "customerPortalUrl" TEXT,
    "updatePaymentMethodUrl" TEXT,
    "updateSubscriptionUrl" TEXT,
    "lastPaymentStatus" "BillingPaymentStatus",
    "lastPaymentAt" TIMESTAMP(3),
    "lastEventName" TEXT,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Billing_accountId_key" ON "Billing"("accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "Billing_lemonSubscriptionId_key" ON "Billing"("lemonSubscriptionId");
CREATE INDEX IF NOT EXISTS "Billing_status_idx" ON "Billing"("status");
CREATE INDEX IF NOT EXISTS "Billing_entitlementActive_idx" ON "Billing"("entitlementActive");
CREATE INDEX IF NOT EXISTS "Billing_variantId_idx" ON "Billing"("variantId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Billing_accountId_fkey'
    ) THEN
        ALTER TABLE "Billing"
          ADD CONSTRAINT "Billing_accountId_fkey"
          FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "accountId" TEXT,
    "billingId" TEXT,
    "eventName" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "invoiceId" TEXT,
    "status" TEXT,
    "rawBody" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingWebhookEvent_idempotencyKey_key" ON "BillingWebhookEvent"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_subscriptionId_idx" ON "BillingWebhookEvent"("subscriptionId");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_accountId_idx" ON "BillingWebhookEvent"("accountId");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_eventName_resourceId_idx" ON "BillingWebhookEvent"("eventName", "resourceId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'BillingWebhookEvent_accountId_fkey'
    ) THEN
        ALTER TABLE "BillingWebhookEvent"
          ADD CONSTRAINT "BillingWebhookEvent_accountId_fkey"
          FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'BillingWebhookEvent_billingId_fkey'
    ) THEN
        ALTER TABLE "BillingWebhookEvent"
          ADD CONSTRAINT "BillingWebhookEvent_billingId_fkey"
          FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
