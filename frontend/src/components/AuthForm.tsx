"use client";

import { saveClientSession } from "@/lib/clientAuth";
import { cn, homeForRole } from "@/lib/utils";
import { ArrowRight, Leaf, RefreshCw, ShoppingBasket, Sprout, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, Field, Input, LogoMark } from "./ui";

const ROLE_OPTIONS = [
  {
    value: "customer",
    icon: ShoppingBasket,
    title: "Customer",
    body: "Shop harvest-fresh produce from farms near you.",
  },
  {
    value: "driver",
    icon: Truck,
    title: "Driver",
    body: "Deliver local routes on your own schedule.",
  },
  {
    value: "farmer",
    icon: Leaf,
    title: "Seller · Farmer",
    body: "List your harvest and sell directly to neighbors.",
  },
];

export function AuthForm({
  mode,
  initialRole,
}: {
  mode: "login" | "register";
  initialRole?: string;
}) {
  const isRegister = mode === "register";
  const [role, setRole] = useState(
    ROLE_OPTIONS.some((r) => r.value === initialRole) ? initialRole! : "customer"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const restore = async () => {
    setRestoring(true);
    try {
      await fetch("/api/health", { cache: "no-store" });
    } catch {}
    window.location.reload();
  };

  const doLogin = async (login: string, pass: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: login, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }
      if (data.token) {
        saveClientSession(data.token, data.user);
      }
      const target = `${homeForRole(data.role)}?token=${encodeURIComponent(data.token || "")}`;
      window.location.replace(target);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      setError("");
      setLoading(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone, password, role }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          setLoading(false);
          return;
        }
        if (data.token) {
          saveClientSession(data.token, data.user);
        }
        const target = `${homeForRole(data.role)}?token=${encodeURIComponent(data.token || "")}`;
        window.location.replace(target);
      } catch {
        setError("Network error. Please try again.");
        setLoading(false);
      }
    } else {
      doLogin(email, password);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      {/* visual panel */}
      <div className="relative hidden overflow-hidden bg-forest-950 lg:block">
        <img
          src="/img/hero-farm.svg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/30 to-forest-950/60" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" aria-label="Back to home">
            <LogoMark dark />
          </Link>
          <div>
            <p className="fade-up font-display max-w-md text-4xl leading-tight font-semibold text-cream">
              “The tomatoes tasted like my grandfather&rsquo;s garden. I didn&rsquo;t know that was
              still possible.”
            </p>
            <p className="mt-4 text-sm font-semibold text-cream/60">
              Maya C. — Crop Connect customer since spring
            </p>
            <div className="mt-8 flex items-center gap-2 text-sage">
              <Sprout className="h-4 w-4" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase">
                Picked this morning · delivered tonight
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="fade-up w-full max-w-md">
          <Link href="/" className="lg:hidden" aria-label="Back to home">
            <LogoMark />
          </Link>
          <h1 className="font-display mt-6 text-4xl font-semibold tracking-tight lg:mt-0">
            {isRegister ? "Pull up a chair." : "Welcome back."}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            {isRegister
              ? "Create your account and join your local food network."
              : "Sign in to get back to your corner of the market."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {isRegister && (
              <div>
                <span className="mb-2 block text-[11px] font-bold tracking-[0.14em] text-ink/60 uppercase">
                  I am joining as a…
                </span>
                <div className="grid gap-2.5">
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-300",
                        role === r.value
                          ? "border-forest-900 bg-forest-900 text-cream shadow-[0_14px_30px_-14px_rgba(12,35,22,0.8)]"
                          : "border-ink/15 bg-white/60 hover:border-ink/40"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors",
                          role === r.value ? "bg-harvest text-forest-950" : "bg-forest-900/8 text-forest-800"
                        )}
                      >
                        <r.icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold">{r.title}</span>
                        <span className={cn("block text-xs", role === r.value ? "text-cream/65" : "text-ink/55")}>
                          {r.body}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "ml-auto h-4 w-4 shrink-0 rounded-full border-2 transition-all",
                          role === r.value ? "border-harvest bg-harvest" : "border-ink/25"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isRegister && (
              <Field label="Full name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Elena Marsh" required />
              </Field>
            )}
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>
            {isRegister && (
              <Field label="Phone (optional)" hint="Drivers and farmers: customers contact you through this number.">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(503) 555-0142"
                />
              </Field>
            )}
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "At least 6 characters" : "Your password"}
                required
                minLength={6}
              />
            </Field>

            {error && (
              <p className="rounded-2xl border border-clay/25 bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">
                {error}
              </p>
            )}

            <Button type="submit" variant="harvest" size="lg" loading={loading} className="group w-full">
              {isRegister ? "Create my account" : "Sign in"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink/60">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="link-underline font-bold text-forest-800">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to Crop Connect?{" "}
                <Link href="/register" className="link-underline font-bold text-forest-800">
                  Create an account
                </Link>
              </>
            )}
          </p>

          {!isRegister && (
            <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white/60 p-4">
              <p className="text-xs font-bold tracking-widest text-ink/70 uppercase">
                One-click sign in <span className="font-medium normal-case tracking-normal text-ink/40">(demo accounts)</span>
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Customer", icon: ShoppingBasket, email: "customer@farmdirect.com" },
                  { label: "Driver", icon: Truck, email: "driver@farmdirect.com" },
                  { label: "Farmer", icon: Leaf, email: "farmer@farmdirect.com" },
                ].map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    disabled={loading}
                    onClick={() => doLogin(d.email, "password123")}
                    className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-ink/15 bg-cream py-3 transition-all hover:-translate-y-0.5 hover:border-harvest hover:bg-harvest/10 disabled:opacity-50"
                  >
                    <d.icon className="h-4.5 w-4.5 text-forest-800" />
                    <span className="text-xs font-bold">{d.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink/50">
                Or sign in manually with any of the demo emails and password{" "}
                <span className="font-bold text-harvest-600">password123</span>.
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={restoring}
            onClick={restore}
            className="mx-auto mt-8 flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-ink/35 transition hover:text-ink/60 disabled:opacity-50"
            aria-label="Refresh and restore the app"
          >
            <RefreshCw className={restoring ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
            {restoring ? "Waking the app up…" : "Page acting up? Tap to refresh & restore the app"}
          </button>
        </div>
      </div>
    </div>
  );
}
