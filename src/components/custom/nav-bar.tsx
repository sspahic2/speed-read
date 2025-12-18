"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { cn } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const links = [
    { href: "/", label: "Home" },
    { href: "/reader", label: "Reader" },
    { href: "/library", label: "Library" },
  ];

  return (
    <header className="z-20 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.22em]">
          Speed Reader
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <NavigationMenu>
            <NavigationMenuList>
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <NavigationMenuItem key={link.href}>
                    <NavigationMenuLink
                      asChild
                      className={cn(
                        "rounded-md px-4 py-2 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground",
                        active && "bg-accent text-accent-foreground",
                      )}
                    >
                      <Link href={link.href}>{link.label}</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          {status === "authenticated" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {session?.user?.name || session?.user?.email || "Signed in"}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => signIn("google")}>
              Log In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
