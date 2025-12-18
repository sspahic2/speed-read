import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      provider?: string | null;
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
  }
}
