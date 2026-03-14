import { DefaultSession, DefaultUser } from "next-auth";
import type { BillingPlanInterval } from "@/lib/billing/types";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      provider?: string | null;
      isSubscribed: boolean;
      planInterval: BillingPlanInterval;
      billingStatus?: string | null;
    };
  }

  interface User extends DefaultUser {
    provider?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    provider?: string | null;
    isSubscribed?: boolean;
    planInterval?: BillingPlanInterval;
    billingStatus?: string | null;
    subscriptionStateRefreshedAt?: number;
  }
}
