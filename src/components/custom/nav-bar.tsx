"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { cn } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/reader", label: "Reader" },
  { href: "/library", label: "Library" },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userLabel = session?.user?.name || session?.user?.email || "Signed in";
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/75 px-4 py-3 shadow-[0_14px_40px_hsl(var(--background)/0.55)] backdrop-blur-xl md:px-5">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-linear-to-b from-muted/70 to-card text-xs font-semibold uppercase tracking-[0.2em] text-primary transition group-hover:scale-[1.03] group-hover:border-primary/60">
                SR
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Speed</span>
                <span className="text-sm font-semibold tracking-wide text-foreground">Reader</span>
              </span>
            </Link>

            <nav className="hidden items-center rounded-full border border-border/70 bg-muted/35 p-1 md:flex">
              {LINKS.map((link) => {
                const active = isActiveRoute(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              {isAuthenticated ? (
                <>
                  <span className="max-w-[180px] truncate rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {userLabel}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                    Sign out
                  </Button>
                </>
              ) : (
                <Button size="sm" disabled={isLoading} onClick={() => signIn("google")}>
                  {isLoading ? "Loading..." : "Log in"}
                </Button>
              )}
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="mobile-menu-sheet w-screen border-border/70 bg-card/95 px-5 pt-10 backdrop-blur-xl sm:max-w-sm [&>button]:fixed [&>button]:top-7.5 [&>button]:right-8 [&>button]:z-60 [&>button]:inline-flex [&>button]:size-8 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:border [&>button]:border-border/70 [&>button]:bg-background/90 [&>button]:opacity-100 [&>button]:shadow-xs [&>button]:backdrop-blur-sm"
              >
                <SheetHeader className="px-0">
                  <SheetTitle className="text-left">Hi {userLabel}</SheetTitle>
                </SheetHeader>

                <div className="mt-4 flex flex-col gap-2">
                  {LINKS.map((link) => {
                    const active = isActiveRoute(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-sm font-medium transition",
                          active
                            ? "border-primary/60 bg-primary/15 text-foreground"
                            : "border-border/70 bg-background/55 text-muted-foreground hover:bg-muted/45 hover:text-foreground",
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-6 border-t border-border/70 pt-4">
                  {isAuthenticated ? (
                    <div className="space-y-3">
                      <p className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {userLabel}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setMobileOpen(false);
                          void signOut({ callbackUrl: "/" });
                        }}
                      >
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={isLoading}
                      onClick={() => {
                        setMobileOpen(false);
                        void signIn("google");
                      }}
                    >
                      {isLoading ? "Loading..." : "Log in"}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

