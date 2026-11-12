"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "./ui";

export type HeaderLink = { href: string; label: string };

export function AppHeader({
  user,
  links,
  theme = "light",
  status,
}: {
  user: { name: string; email: string; role: string };
  links: HeaderLink[];
  theme?: "light" | "dark";
  status?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [tokenParam, setTokenParam] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);
  const dark = theme === "dark";

  useEffect(() => {
    try {
      const { getClientToken } = require("@/lib/clientAuth");
      const t = getClientToken();
      if (t) setTokenParam(`?token=${encodeURIComponent(t)}`);
    } catch {}
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logout = async () => {
    try {
      const { authFetch, clearClientSession } = await import("@/lib/clientAuth");
      await authFetch("/api/auth/logout", { method: "POST" });
      clearClientSession();
    } catch {}
    window.location.href = "/login";
  };

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-500 backdrop-blur-xl",
        dark
          ? scrolled
            ? "border-cream/10 bg-forest-950/88 shadow-[0_14px_40px_-24px_rgba(0,0,0,0.55)]"
            : "border-cream/8 bg-forest-950/72"
          : scrolled
            ? "border-forest-700/10 bg-cream/92 shadow-[0_18px_40px_-28px_rgba(26,68,37,0.22)]"
            : "border-transparent bg-cream/72"
      )}
    >
      <div className={cn("mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 transition-all duration-500", scrolled ? "h-14" : "h-20")}>
        <Link href="/" aria-label="Crop Connect home">
          <LogoMark dark={dark} compact={scrolled} size={scrolled ? "sm" : "md"} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            const target = `${l.href}${tokenParam}`;
            return (
              <Link
                key={l.href}
                href={target}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300",
                  dark
                    ? active
                      ? "bg-cream text-forest-950"
                      : "text-cream/70 hover:bg-cream/10 hover:text-cream"
                    : active
                      ? "bg-forest-900 text-cream"
                      : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {status}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-full border py-1.5 pr-3 pl-1.5 transition",
                dark
                  ? "border-cream/15 hover:border-cream/40"
                  : "border-ink/15 hover:border-ink/40"
              )}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-leaf text-xs font-bold text-forest-950">
                {initials}
              </span>
              <span className={cn("hidden text-sm font-semibold sm:block", dark ? "text-cream" : "text-ink")}>
                {user.name.split(" ")[0]}
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5", dark ? "text-cream/60" : "text-ink/50")} />
            </button>
            {menuOpen && (
              <div
                className={cn(
                  "fade-up absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border shadow-2xl",
                  dark ? "border-cream/15 bg-forest-900" : "border-ink/10 bg-white"
                )}
              >
                <div className={cn("border-b px-4 py-3", dark ? "border-cream/10" : "border-ink/10")}>
                  <p className={cn("text-sm font-bold", dark ? "text-cream" : "text-ink")}>{user.name}</p>
                  <p className={cn("text-xs", dark ? "text-cream/50" : "text-ink/50")}>{user.email}</p>
                  <span className="mt-2 inline-block rounded-full bg-harvest/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-harvest-600 uppercase">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold transition",
                    dark ? "text-cream/80 hover:bg-cream/10" : "text-ink/80 hover:bg-ink/5"
                  )}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* mobile nav */}
      <nav className={cn("flex gap-1 overflow-x-auto px-4 pb-2 md:hidden", dark ? "text-cream" : "text-ink")}>
        {links.map((l) => {
          const active = pathname === l.href;
          const target = `${l.href}${tokenParam}`;
          return (
            <Link
              key={l.href}
              href={target}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap",
                active ? (dark ? "bg-cream text-forest-950" : "bg-forest-900 text-cream") : dark ? "text-cream/70" : "text-ink/60"
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
