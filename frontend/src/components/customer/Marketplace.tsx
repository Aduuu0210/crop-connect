"use client";

import { Button, Badge, Field } from "@/components/ui";
import type { MarketProduct } from "@/lib/queries";
import { cn, formatMoney, harvestLabel } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Minus,
  PackageOpen,
  Plus,
  ShoppingBag,
  Sprout,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Addr = {
  id: string;
  label: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
};

const DELIVERY_FEE = 499;

export function Marketplace({
  products,
  addresses,
}: {
  products: MarketProduct[];
  addresses: Addr[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const [drawer, setDrawer] = useState<"closed" | "cart" | "checkout" | "success">("closed");
  const [addressId, setAddressId] = useState<string>("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placedId, setPlacedId] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fd_cart");
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("fd_cart", JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    if (def && !addressId) setAddressId(def.id);
  }, [addresses, addressId]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: byId.get(id), qty }))
    .filter((l): l is { product: MarketProduct; qty: number } => !!l.product && l.qty > 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.product.priceCents * l.qty, 0);

  const groups = useMemo(() => {
    const map = new Map<string, { farm: MarketProduct["farm"]; items: MarketProduct[] }>();
    for (const p of products) {
      const g = map.get(p.farm.id) ?? { farm: p.farm, items: [] };
      g.items.push(p);
      map.set(p.farm.id, g);
    }
    return [...map.values()];
  }, [products]);

  const setQty = (id: string, qty: number) => {
    const max = byId.get(id)?.quantity ?? 0;
    setCart((c) => {
      const next = { ...c };
      const clamped = Math.max(0, Math.min(qty, max));
      if (clamped === 0) delete next[id];
      else next[id] = clamped;
      return next;
    });
  };

  const placeOrder = async () => {
    if (!addressId) {
      setError("Choose a delivery address first.");
      return;
    }
    setPlacing(true);
    setError("");
    try {
      const { authFetch } = await import("@/lib/clientAuth");
      const res = await authFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId,
          items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed.");
        setPlacing(false);
        return;
      }
      setPlacedId(data.orderId);
      setCart({});
      setDrawer("success");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      {groups.length === 0 && (
        <div className="mt-16 flex flex-col items-center rounded-3xl border border-dashed border-ink/20 px-8 py-20 text-center">
          <PackageOpen className="h-8 w-8 text-ink/40" />
          <p className="font-display mt-4 text-2xl font-semibold">The stands are being stocked</p>
          <p className="mt-1 text-sm text-ink/55">Check back soon — farmers add fresh batches daily.</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.farm.id} className="mt-14">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{g.farm.name}</h2>
            <span className="flex items-center gap-1 text-xs font-semibold text-ink/50">
              <MapPin className="h-3 w-3" /> {g.farm.city}
            </span>
            <span className="ml-auto text-xs font-bold text-ink/40">
              {g.items.length} fresh item{g.items.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.items.map((p) => {
              const inCart = cart[p.id] ?? 0;
              return (
                <article
                  key={p.id}
                  className="group flex flex-col overflow-hidden rounded-[24px] border border-ink/10 bg-white/70 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_44px_-20px_rgba(12,35,22,0.35)]"
                >
                  <div className="relative overflow-hidden">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid aspect-[4/3] w-full place-items-center bg-parchment">
                        <Sprout className="h-10 w-10 text-moss/40" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-forest-950/75 px-3 py-1.5 text-[10px] font-bold tracking-wide text-cream backdrop-blur">
                      <Sprout className="h-3 w-3 text-sage" /> {harvestLabel(p.harvestedAt)}
                    </span>
                    {p.quantity <= 6 && (
                      <span className="absolute top-3 right-3 rounded-full bg-clay px-3 py-1.5 text-[10px] font-bold tracking-wide text-cream">
                        Only {p.quantity} left
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg leading-snug font-semibold">{p.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink/55">{p.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-base font-bold">
                        {formatMoney(p.priceCents)}
                        <span className="ml-1 text-xs font-semibold text-ink/45">/ {p.unit}</span>
                      </p>
                      {inCart === 0 ? (
                        <Button size="sm" variant="forest" onClick={() => setQty(p.id, 1)}>
                          <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 rounded-full border border-ink/15 bg-cream p-1">
                          <button
                            onClick={() => setQty(p.id, inCart - 1)}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full transition hover:bg-ink/10"
                            aria-label="Decrease"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{inCart}</span>
                          <button
                            onClick={() => setQty(p.id, inCart + 1)}
                            disabled={inCart >= p.quantity}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full transition hover:bg-ink/10 disabled:opacity-30"
                            aria-label="Increase"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {/* floating cart button */}
      {count > 0 && drawer === "closed" && (
        <button
          onClick={() => setDrawer("cart")}
          className="fade-up fixed right-5 bottom-5 z-40 flex cursor-pointer items-center gap-3 rounded-full bg-forest-900 py-3 pr-6 pl-4 text-cream shadow-[0_20px_40px_-14px_rgba(12,35,22,0.8)] transition hover:-translate-y-0.5 hover:bg-forest-800"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-harvest text-forest-950">
            <ShoppingBag className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-cream text-[10px] font-bold text-forest-950 ring-2 ring-forest-900">
              {count}
            </span>
          </span>
          <span className="text-sm font-bold">{formatMoney(subtotal + DELIVERY_FEE)}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {/* cart drawer */}
      {drawer !== "closed" && (
        <div className="fixed inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-forest-950/55 backdrop-blur-sm"
            onClick={() => setDrawer("closed")}
            aria-hidden
          />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
              <h3 className="font-display text-2xl font-semibold">
                {drawer === "success" ? "Order placed" : drawer === "checkout" ? "Checkout" : "Your basket"}
              </h3>
              <button
                onClick={() => setDrawer("closed")}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-ink/15 text-ink/60 transition hover:border-ink hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {drawer === "success" ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <CheckCircle2 className="h-16 w-16 text-leaf" />
                <h4 className="font-display mt-5 text-2xl font-semibold">The farms are on it</h4>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">
                  Each farm has been notified and is packing your batch. We&rsquo;re broadcasting
                  the delivery to nearby drivers right now.
                </p>
                <Badge tone="leaf" className="mt-4">Order {placedId.slice(0, 8).toUpperCase()}</Badge>
                <div className="mt-8 flex gap-3">
                  <Button variant="forest" onClick={() => (window.location.href = "/customer/orders")}>
                    Track order <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setDrawer("closed")}>
                    Keep shopping
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {drawer === "cart" && (
                    <div className="space-y-4">
                      {lines.map((l) => (
                        <div key={l.product.id} className="flex gap-4 rounded-2xl border border-ink/10 bg-white/70 p-3">
                          {l.product.imageUrl ? (
                            <img src={l.product.imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
                          ) : (
                            <div className="grid h-16 w-16 place-items-center rounded-xl bg-parchment">
                              <Sprout className="h-5 w-5 text-moss/50" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{l.product.name}</p>
                            <p className="text-xs text-ink/50">{l.product.farm.name}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1 rounded-full border border-ink/15 p-0.5">
                                <button onClick={() => setQty(l.product.id, l.qty - 1)} className="grid h-6 w-6 cursor-pointer place-items-center rounded-full hover:bg-ink/10" aria-label="Decrease">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-5 text-center text-xs font-bold">{l.qty}</span>
                                <button onClick={() => setQty(l.product.id, l.qty + 1)} disabled={l.qty >= l.product.quantity} className="grid h-6 w-6 cursor-pointer place-items-center rounded-full hover:bg-ink/10 disabled:opacity-30" aria-label="Increase">
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-sm font-bold">{formatMoney(l.product.priceCents * l.qty)}</p>
                            </div>
                          </div>
                          <button onClick={() => setQty(l.product.id, 0)} className="cursor-pointer self-start text-ink/30 transition hover:text-clay" aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {drawer === "checkout" && (
                    <div className="space-y-5">
                      <Field label="Deliver to">
                        <div className="space-y-2.5">
                          {addresses.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setAddressId(a.id)}
                              className={cn(
                                "flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition",
                                addressId === a.id
                                  ? "border-forest-900 bg-forest-900 text-cream"
                                  : "border-ink/15 bg-white/70 hover:border-ink/40"
                              )}
                            >
                              <MapPin className={cn("mt-0.5 h-4 w-4 shrink-0", addressId === a.id ? "text-harvest" : "text-ink/40")} />
                              <span>
                                <span className="flex items-center gap-2 text-sm font-bold">
                                  {a.label}
                                  {a.isDefault && (
                                    <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase", addressId === a.id ? "bg-cream/15" : "bg-ink/8")}>
                                      default
                                    </span>
                                  )}
                                </span>
                                <span className={cn("block text-xs", addressId === a.id ? "text-cream/65" : "text-ink/55")}>
                                  {a.line1}, {a.city}, {a.state} {a.zip}
                                </span>
                              </span>
                            </button>
                          ))}
                          {addresses.length === 0 && (
                            <p className="rounded-2xl border border-dashed border-ink/25 p-4 text-sm text-ink/60">
                              You need a delivery address first.{" "}
                              <Link href="/customer/addresses" className="link-underline font-bold text-forest-800">
                                Add one in your address book
                              </Link>
                              .
                            </p>
                          )}
                        </div>
                      </Field>
                      <div className="rounded-2xl bg-parchment/70 p-4 text-sm">
                        <p className="font-bold">Arriving today</p>
                        <p className="mt-0.5 text-ink/60">
                          A nearby driver picks up from each farm and brings everything in one trip.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-ink/10 px-6 py-5">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-ink/60">
                      <span>Subtotal</span>
                      <span className="font-semibold text-ink">{formatMoney(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-ink/60">
                      <span>Delivery</span>
                      <span className="font-semibold text-ink">{formatMoney(DELIVERY_FEE)}</span>
                    </div>
                    <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-bold">
                      <span>Total</span>
                      <span>{formatMoney(subtotal + DELIVERY_FEE)}</span>
                    </div>
                  </div>
                  {error && (
                    <p className="mt-3 rounded-xl border border-clay/25 bg-clay/10 px-3 py-2 text-xs font-semibold text-clay">
                      {error}
                    </p>
                  )}
                  {drawer === "cart" ? (
                    <Button variant="harvest" size="lg" className="mt-4 w-full" onClick={() => setDrawer("checkout")}>
                      Checkout <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="mt-4 flex gap-2.5">
                      <Button variant="outline" size="lg" className="flex-1" onClick={() => setDrawer("cart")}>
                        Back
                      </Button>
                      <Button
                        variant="harvest"
                        size="lg"
                        className="flex-[2]"
                        loading={placing}
                        disabled={addresses.length === 0}
                        onClick={placeOrder}
                      >
                        Place order · {formatMoney(subtotal + DELIVERY_FEE)}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
