import type { Metadata } from "next";
import { HomePageClient } from "@/components/custom/home-page-client";
import { JsonLd } from "@/components/custom/json-ld";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd />
      <HomePageClient />
    </>
  );
}
