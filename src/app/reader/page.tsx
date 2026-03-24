import { getServerSession } from "next-auth";
import { ReaderExperience } from "@/components/custom/reader-experience";
import { authOptions } from "@/lib/auth";
import { getSubscriptionStateForUser } from "@/lib/billing/subscription-state";

export const dynamic = "force-dynamic";

export default async function ReaderPage() {
  const session = await getServerSession(authOptions);

  const isSubscribed = session?.user?.id
    ? (await getSubscriptionStateForUser(session.user.id)).isSubscribed
    : false;

  return <ReaderExperience isSubscribed={isSubscribed} />;
}
