"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "./ui";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-all duration-500 backdrop-blur-xl",
        scrolled
          ? "border-forest-700/10 bg-cream/92 shadow-[0_18px_44px_-28px_rgba(26,68,37,0.24)]"
          : "border-transparent bg-transparent"
      )}
    >
      <div className={cn("mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 transition-all duration-500", scrolled ? "h-20" : "h-32")}>
        <Link href="/" aria-label="Crop Connect home">
          <LogoMark compact={scrolled} size={scrolled ? "sm" : "lg"} />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-forest-700 md:flex">
          <a href="#how" className="link-underline hover:text-moss">How it works</a>
          <a href="#roles" className="link-underline hover:text-moss">Join Crop Connect</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-bold text-forest-700 transition hover:bg-forest-700/6 hover:text-moss">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-harvest px-5 py-2.5 text-sm font-bold text-forest-950 shadow-[0_10px_24px_-10px_rgba(232,163,23,0.55)] transition hover:-translate-y-0.5 hover:bg-harvest-600"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
