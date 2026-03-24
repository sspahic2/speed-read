import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getSubscriptionStateForUser } from "@/lib/billing/subscription-state";
import { ensureUserFolder } from "@/services/backend-services/blob-service";

const log = createLogger("auth");

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const BILLING_SESSION_REFRESH_MS = 5 * 60 * 1000;

if (!googleClientId || !googleClientSecret) {
  throw new Error("Missing Google OAuth environment variables.");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma as any),
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      profile(profile) {
        const fullName =
          profile.name ??
          [profile.given_name, profile.family_name].filter(Boolean).join(" ");

        return {
          id: profile.sub,
          name: fullName || null,
          email: profile.email,
          image: profile.picture,
          provider: "google",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.provider = (user as { provider?: string | null }).provider ?? "google";
      }

      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      if (!token.provider && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { provider: true },
        });
        token.provider = dbUser?.provider ?? "google";
      }

      const userId = ((token.id as string | undefined) ?? token.sub)?.toString();
      const lastRefresh = Number(token.subscriptionStateRefreshedAt ?? 0);
      const shouldRefreshSubscriptionState =
        Boolean(user) ||
        trigger === "update" ||
        !lastRefresh ||
        Date.now() - lastRefresh >= BILLING_SESSION_REFRESH_MS;

      if (userId && shouldRefreshSubscriptionState) {
        try {
          const subscriptionState = await getSubscriptionStateForUser(userId);
          token.isSubscribed = subscriptionState.isSubscribed;
          token.planInterval = subscriptionState.planInterval;
          token.billingStatus = subscriptionState.status;
        } catch (error) {
          log.error("Failed to refresh billing session state", {
            userId,
            error: error instanceof Error ? error.message : "Unknown billing session error",
          });

          token.isSubscribed = Boolean(token.isSubscribed);
          token.planInterval =
            (token.planInterval as "month" | "year" | "unknown" | undefined) ?? "unknown";
          token.billingStatus = (token.billingStatus as string | null | undefined) ?? null;
        }

        token.subscriptionStateRefreshedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || token.sub || "";
        session.user.provider = (token.provider as string | null) ?? "google";
        session.user.isSubscribed = Boolean(token.isSubscribed);
        session.user.planInterval = (token.planInterval as "month" | "year" | "unknown" | undefined) ?? "unknown";
        session.user.billingStatus = (token.billingStatus as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      try {
        if (user?.id) {
          await ensureUserFolder(user.id);
        }
      } catch (error) {
        log.error("Failed to create user blob folder", {
          userId: user?.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  },
};
