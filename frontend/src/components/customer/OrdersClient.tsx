"use client";

import { LiveMap } from "@/components/LiveMap";
import { Badge, Button, EmptyState, Stars, Textarea } from "@/components/ui";
import type { CustomerOrder } from "@/lib/queries";
import {
  cn,
  formatMoney,
  ORDER_STATUS_LABEL,
  ORDER_STEPS,
  orderStepIndex,
  shortId,
  timeAgo,
} from "@/lib/utils";
import {
  Camera,
  Check,
  ChevronDown,
  Headset,
  LifeBuoy,
  MapPin,
  Package,
  Phone,
  Receipt,
  Search,
  ShoppingBasket,
  Sprout,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STEP_ICONS = [Receipt, Search, Truck, Check] as const;

function statusTone(status: string) {
  switch (status) {
    case "delivered":
      return "leaf" as const;
    case "in_transit":
      return "harvest" as const;
    case "driver_assigned":
      return "forest" as const;
    default:
      return "clay" as const;
  }
}

export function OrdersClient({ initialOrders }: { initialOrders: CustomerOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [openId, setOpenId] = useState<string | null>(orders[0]?.id ?? null);

  const refresh = useCallback(async () => {
    try {
      const { authFetch } = await import("@/lib/clientAuth");
      const res = await authFetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  if (orders.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState
          icon={Package}
          title="No orders yet"
          body="Your basket is waiting to be filled with this week's harvest."
          action={
            <Link href="/customer">
              <Button variant="harvest">
                <ShoppingBasket className="h-4 w-4" /> Browse the market
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      {orders.map((o) => (
        <OrderCard
          key={o.id}
          order={o}
          open={openId === o.id}
          onToggle={() => setOpenId(openId === o.id ? null : o.id)}
          onChanged={refresh}
        />
      ))}
    </div>
  );
}

function OrderCard({
  order: o,
  open,
  onToggle,
  onChanged,
}: {
  order: CustomerOrder;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const step = orderStepIndex(o.status);
  const assigned = o.delivery && o.delivery.status !== "pending";
  const driverPos = o.delivery?.driverPos ?? null;
  const delivered = o.status === "delivered";

  return (
    <article className="overflow-hidden rounded-[26px] border border-ink/10 bg-white/70 transition-shadow hover:shadow-[0_22px_44px_-24px_rgba(12,35,22,0.3)]">
      {/* header row */}
      <button onClick={onToggle} className="flex w-full cursor-pointer flex-wrap items-center gap-3 px-5 py-4 text-left sm:px-6">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-900/6">
          <Package className="h-5 w-5 text-forest-800" />
        </span>
        <span>
          <span className="block text-sm font-bold">Order {shortId(o.id)}</span>
          <span className="block text-xs text-ink/50">
            {timeAgo(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)} items · {formatMoney(o.totalCents)}
          </span>
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Badge tone={statusTone(o.status)}>
            {o.status === "in_transit" && <span className="pulse-dot relative h-1.5 w-1.5 rounded-full bg-harvest-600" />}
            {ORDER_STATUS_LABEL[o.status] ?? o.status}
          </Badge>
          <ChevronDown className={cn("h-4 w-4 text-ink/40 transition-transform duration-500", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="fade-up border-t border-ink/8 px-5 py-5 sm:px-6">
          {/* timeline */}
          <ol className="flex items-center">
            {ORDER_STEPS.map((s, i) => {
              const Icon = STEP_ICONS[i];
              const done = i <= step;
              return (
                <li key={s.key} className={cn("flex items-center", i < ORDER_STEPS.length - 1 && "flex-1")}>
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-full border-2 transition-all duration-500",
                        done ? "border-forest-900 bg-forest-900 text-cream" : "border-ink/15 text-ink/30"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={cn("text-center text-[9px] font-bold tracking-wide uppercase sm:text-[10px]", done ? "text-forest-800" : "text-ink/35")}>
                      {s.label}
                    </span>
                  </div>
                  {i < ORDER_STEPS.length - 1 && (
                    <div className={cn("mx-2 mb-5 h-0.5 flex-1 rounded-full transition-colors duration-700", i < step ? "bg-forest-900" : "bg-ink/10")} />
                  )}
                </li>
              );
            })}
          </ol>

          {o.status === "placed" && (
            <div className="shimmer mt-6 flex items-center gap-3 rounded-2xl border border-ink/10 px-5 py-4">
              <Search className="h-4.5 w-4.5 shrink-0 text-ink/50" />
              <p className="text-sm font-semibold text-ink/70">
                Broadcasting your order to nearby drivers — live tracking unlocks the moment one accepts.
              </p>
            </div>
          )}

          {/* live map — visible only after a driver accepts */}
          {assigned && o.pickup && o.address && !delivered && (
            <div className="mt-6">
              <LiveMap
                theme="dark"
                pickup={{ lat: o.pickup.lat, lng: o.pickup.lng, label: o.pickup.label }}
                dropoff={{ lat: o.address.lat, lng: o.address.lng, label: o.address.label }}
                driverPos={driverPos}
              />
              {!driverPos && (
                <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink/55">
                  <span className="pulse-dot relative h-2 w-2 rounded-full bg-harvest text-harvest" />
                  {o.delivery?.status === "accepted"
                    ? "Your driver is at the farm picking up your batch…"
                    : "Locking on to your driver's signal…"}
                </p>
              )}
            </div>
          )}

          {/* driver card */}
          {assigned && o.delivery?.driver && !delivered && (
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-ink/10 bg-parchment/60 px-5 py-4">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-harvest font-display text-sm font-bold text-forest-950">
                {o.delivery.driver.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <div>
                <p className="text-sm font-bold">{o.delivery.driver.name}</p>
                <p className="text-xs text-ink/55">Your Crop Connect driver</p>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                {o.delivery.driver.phone && (
                  <a href={`tel:${o.delivery.driver.phone}`}>
                    <Button size="sm" variant="forest">
                      <Phone className="h-3.5 w-3.5" /> Call driver
                    </Button>
                  </a>
                )}
                <a href="mailto:support@farmdirect.co?subject=Order%20support">
                  <Button size="sm" variant="outline">
                    <Headset className="h-3.5 w-3.5" /> Support
                  </Button>
                </a>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            {/* items */}
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-ink/50 uppercase">In this order</p>
              <ul className="mt-3 space-y-2.5">
                {o.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 rounded-2xl border border-ink/8 bg-white/70 p-2.5">
                    {i.imageUrl ? (
                      <img src={i.imageUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-parchment">
                        <Sprout className="h-4 w-4 text-moss/50" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{i.name}</span>
                      <span className="block text-xs text-ink/50">
                        {i.farmName} · {i.quantity} {i.unit}
                      </span>
                    </span>
                    <span className="text-sm font-bold">{formatMoney(i.priceCents * i.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* summary */}
            <div className="space-y-4">
              {o.address && (
                <div className="rounded-2xl border border-ink/8 bg-white/70 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.16em] text-ink/50 uppercase">
                    <MapPin className="h-3.5 w-3.5" /> Delivered to
                  </p>
                  <p className="mt-2 text-sm font-bold">{o.address.label}</p>
                  <p className="text-xs text-ink/55">
                    {o.address.line1}, {o.address.city}, {o.address.state} {o.address.zip}
                  </p>
                </div>
              )}
              <div className="rounded-2xl border border-ink/8 bg-white/70 p-4 text-sm">
                <div className="flex justify-between text-ink/60">
                  <span>Subtotal</span>
                  <span className="font-semibold text-ink">{formatMoney(o.subtotalCents)}</span>
                </div>
                <div className="mt-1 flex justify-between text-ink/60">
                  <span>Delivery</span>
                  <span className="font-semibold text-ink">{formatMoney(o.deliveryFeeCents)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 font-bold">
                  <span>Total</span>
                  <span>{formatMoney(o.totalCents)}</span>
                </div>
              </div>

              {delivered && o.delivery?.proofPhoto && (
                <div className="rounded-2xl border border-ink/8 bg-white/70 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.16em] text-ink/50 uppercase">
                    <Camera className="h-3.5 w-3.5" /> Proof of delivery
                  </p>
                  <img src={o.delivery.proofPhoto} alt="Package at your door" className="mt-2 max-h-40 rounded-xl object-cover" />
                </div>
              )}
            </div>
          </div>

          {delivered && <PostDelivery order={o} onChanged={onChanged} />}
        </div>
      )}
    </article>
  );
}

function PostDelivery({ order: o, onChanged }: { order: CustomerOrder; onChanged: () => void }) {
  const [productRating, setProductRating] = useState(o.feedback?.productRating ?? 0);
  const [driverRating, setDriverRating] = useState(o.feedback?.driverRating ?? 0);
  const [comment, setComment] = useState(o.feedback?.comment ?? "");
  const [report, setReport] = useState("");
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [saved, setSaved] = useState(!!o.feedback);
  const [reported, setReported] = useState(false);

  const submitFeedback = async () => {
    if (!productRating && !driverRating && !comment.trim()) return;
    setSaving(true);
    const { authFetch } = await import("@/lib/clientAuth");
    await authFetch(`/api/orders/${o.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productRating: productRating || undefined, driverRating: driverRating || undefined, comment }),
    });
    setSaving(false);
    setSaved(true);
    onChanged();
  };

  const submitReport = async () => {
    if (!report.trim()) return;
    setReporting(true);
    const { authFetch } = await import("@/lib/clientAuth");
    await authFetch(`/api/orders/${o.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report }),
    });
    setReporting(false);
    setReported(true);
    setReport("");
  };

  return (
    <div className="mt-6 grid gap-5 border-t border-ink/8 pt-6 lg:grid-cols-2">
      {/* rating */}
      <div className="rounded-2xl border border-harvest/25 bg-harvest/8 p-5">
        <p className="font-display text-lg font-semibold">How was it?</p>
        {saved ? (
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink/70">The produce</span>
              <Stars value={o.feedback?.productRating ?? productRating} size={18} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink/70">The delivery</span>
              <Stars value={o.feedback?.driverRating ?? driverRating} size={18} />
            </div>
            {o.feedback?.comment && <p className="pt-1 text-sm text-ink/60 italic">“{o.feedback.comment}”</p>}
            <p className="flex items-center gap-1.5 pt-1 text-xs font-bold text-moss">
              <Check className="h-3.5 w-3.5" /> Thanks — your rating helps the whole network.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink/70">The produce</span>
              <Stars value={productRating} onChange={setProductRating} size={22} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink/70">The delivery</span>
              <Stars value={driverRating} onChange={setDriverRating} size={22} />
            </div>
            <Textarea placeholder="Anything worth noting? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button variant="forest" size="sm" loading={saving} onClick={submitFeedback} disabled={!productRating && !driverRating && !comment.trim()}>
              Submit rating
            </Button>
          </div>
        )}
      </div>

      {/* report */}
      <div className="rounded-2xl border border-ink/10 bg-white/70 p-5">
        <p className="flex items-center gap-2 font-display text-lg font-semibold">
          <LifeBuoy className="h-5 w-5 text-clay" /> Something wrong?
        </p>
        {reported ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-moss">
            <Check className="h-4 w-4" /> Report filed — our support team will reach out shortly.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink/55">
              Bruised produce, missing items, a late handoff — tell us and we&rsquo;ll make it right.
            </p>
            <Textarea className="mt-3" placeholder="Describe the problem…" value={report} onChange={(e) => setReport(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" loading={reporting} onClick={submitReport} disabled={!report.trim()}>
                Report a problem
              </Button>
              <a href="mailto:support@farmdirect.co?subject=Order%20issue">
                <Button variant="ghost" size="sm">
                  <Headset className="h-3.5 w-3.5" /> Contact support
                </Button>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
