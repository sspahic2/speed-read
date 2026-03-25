import type { Metadata } from "next";
import { PricingPageClient } from "@/components/custom/pricing-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple pricing for Speed Reader. Start with a free trial and upgrade to unlock your full cloud library and unlimited reading.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
