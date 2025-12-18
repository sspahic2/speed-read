import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import { ensureUserFolder } from "@/services/backend-services/blob-service";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

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
    async jwt({ token, user }) {
      // On first sign-in, attach DB info
      if (user) {
        token.id = user.id;
        token.provider = (user as { provider?: string | null }).provider ?? "google";
      }

      // If token already has id, ensure we still have provider info (e.g. on subsequent requests)
      if (!token.provider && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { provider: true },
        });
        token.provider = dbUser?.provider ?? "google";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || token.sub || "";
        session.user.provider = (token.provider as string | null) ?? "google";
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
        console.error("Failed to create user blob folder", error);
      }
    },
  },
};
