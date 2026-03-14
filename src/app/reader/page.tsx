import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ReaderExperience } from "@/components/custom/reader-experience";
import { authOptions } from "@/lib/auth";
import { getSubscriptionStateForUser } from "@/lib/billing/subscription-state";

export const dynamic = "force-dynamic";

export default async function ReaderPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const subscriptionState = await getSubscriptionStateForUser(session.user.id);

  if (!subscriptionState.isSubscribed) {
    redirect("/pricing");
  }

  return <ReaderExperience isSubscribed={subscriptionState.isSubscribed} />;
}
