"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="bg-linear-to-b from-background via-background/70 to-background">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
        <div className="rounded-2xl border border-border/70 bg-card/80 p-8 shadow-sm">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
            <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Continue with Google to sync your library and reader settings across devices.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <Button size="lg" onClick={() => signIn("google")}>
              Continue with Google
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
