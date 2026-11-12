"use client";

import { LiveMap } from "@/components/LiveMap";
import { Button, EmptyState } from "@/components/ui";
import { routePoint } from "@/lib/geo";
import type { ActiveDelivery, BoardJob } from "@/lib/queries";
import { cn, formatMoney, shortId, timeAgo } from "@/lib/utils";
import {
  Banknote,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Headset,
  Lock,
  MapPin,
  Navigation,
  Package,
  Phone,
  Route,
  Sprout,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Stats = { completed: number; earningsCents: number };

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DriverClient({
  initialJobs,
  initialActive,
  initialStats,
}: {
  initialJobs: BoardJob[];
  initialActive: ActiveDelivery | null;
  initialStats: Stats;
}) {
  const [tab, setTab] = useState<"board" | "active">(initialActive ? "active" : "board");
  const [jobs, setJobs] = useState(initialJobs);
  const [stats, setStats] = useState(initialStats);
  const [active, setActive] = useState<ActiveDelivery | null>(initialActive);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [collected, setCollected] = useState<Record<string, boolean>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [prog, setProg] = useState(initialActive?.progress ?? 0);
  const fileRef = useRef<HTMLInputElement>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshBoard = useCallback(async () => {
    try {
      const { authFetch } = await import("@/lib/clientAuth");
      const res = await authFetch("/api/deliveries", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setStats(data.stats);
      }
    } catch {}
  }, []);

  const refreshActive = useCallback(async () => {
    try {
      const { authFetch } = await import("@/lib/clientAuth");
      const res = await authFetch("/api/deliveries?active=1", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setActive(data.active);
        if (!data.active) setTab("board");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      refreshBoard();
      refreshActive();
    }, 4500);
    return () => clearInterval(t);
  }, [refreshBoard, refreshActive]);

  // reset progress when a new delivery becomes active
  useEffect(() => {
    setProg(active?.progress ?? 0);
    setPhoto(null);
    setCollected({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // simulated GPS: once picked up, the van rolls along the shared route curve
  useEffect(() => {
    if (!active || active.status !== "picked_up" || !active.pickups[0] || !active.dropoff) return;
    if (simRef.current) return;
    const from = active.pickups[0];
    const to = active.dropoff;
    simRef.current = setInterval(() => {
      setProg((prev) => {
        const next = Math.min(1, prev + 0.022);
        const p = routePoint(next, from, to);
        import("@/lib/clientAuth").then(({ authFetch }) => {
          authFetch(`/api/deliveries/${active.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "location", lat: p.lat, lng: p.lng, progress: next }),
          }).catch(() => {});
        });
        return next;
      });
    }, 2200);
    return () => {
      if (simRef.current) clearInterval(simRef.current);
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.status]);

  const act = async (id: string, action: string, extra?: Record<string, unknown>) => {
    const { authFetch } = await import("@/lib/clientAuth");
    const res = await authFetch(`/api/deliveries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    return res;
  };

  const accept = async (job: BoardJob) => {
    setBusyId(job.id);
    setNotice("");
    const res = await act(job.id, "accept");
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json();
      setNotice(data.error ?? "Could not accept.");
      refreshBoard();
      return;
    }
    await refreshActive();
    setTab("active");
  };

  const reject = async (job: BoardJob) => {
    setBusyId(job.id);
    await act(job.id, "reject");
    setBusyId(null);
    setJobs((j) => j.filter((x) => x.id !== job.id));
  };

  const pickup = async () => {
    if (!active) return;
    setBusyId(active.id);
    await act(active.id, "pickup");
    setBusyId(null);
    refreshActive();
  };

  const complete = async () => {
    if (!active || !photo) return;
    setCompleting(true);
    const res = await act(active.id, "complete", { photo });
    setCompleting(false);
    if (!res.ok) {
      const data = await res.json();
      setNotice(data.error ?? "Could not complete.");
      return;
    }
    setProg(1);
    setNotice("");
    setPhoto(null);
    const payout = active.payoutCents;
    setActive(null);
    setStats((s) => ({ completed: s.completed + 1, earningsCents: s.earningsCents + payout }));
    setTab("board");
    setNotice(`Delivered. ${formatMoney(payout)} added to tonight's earnings.`);
    refreshBoard();
  };

  const driverPos =
    active && active.status === "picked_up" && active.pickups[0] && active.dropoff
      ? routePoint(prog, active.pickups[0], active.dropoff)
      : null;

  return (
    <div className="mt-8">
      {/* stats + tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-cream/15 bg-cream/5 p-1">
          {(
            [
              { key: "board", label: "Delivery board" },
              { key: "active", label: active ? "Active delivery" : "Active delivery · none" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "cursor-pointer rounded-full px-5 py-2 text-sm font-bold transition-all",
                tab === t.key ? "bg-harvest text-forest-950" : "text-cream/60 hover:text-cream"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-4 py-2 text-sm font-bold">
            <CheckCircle2 className="h-4 w-4 text-leaf" /> {stats.completed} delivered
          </span>
          <span className="flex items-center gap-2 rounded-full border border-harvest/30 bg-harvest/12 px-4 py-2 text-sm font-bold text-harvest">
            <Banknote className="h-4 w-4" /> {formatMoney(stats.earningsCents)}
          </span>
        </div>
      </div>

      {notice && (
        <p className="mt-5 rounded-2xl border border-harvest/30 bg-harvest/12 px-5 py-3.5 text-sm font-bold text-harvest">
          {notice}
        </p>
      )}

      {tab === "board" && (
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {jobs.length === 0 && (
            <div className="lg:col-span-2 [&>div]:border-cream/20">
              <EmptyState
                icon={Route}
                title="The board is quiet"
                body="New delivery requests land here the moment a neighbor checks out. Hang tight."
              />
            </div>
          )}
          {jobs.map((j) => (
            <article
              key={j.id}
              className="group rounded-[26px] border border-cream/12 bg-cream/[0.045] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-harvest/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.16em] text-cream/40 uppercase">
                    {shortId(j.orderId)} · {timeAgo(j.createdAt)}
                  </p>
                  <h3 className="font-display mt-1.5 text-xl leading-snug font-semibold">{j.farmNames}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-cream/55">
                    <Warehouse className="h-3.5 w-3.5" /> {j.farmCity}
                    <ChevronRight className="h-3.5 w-3.5 text-harvest" />
                    <MapPin className="h-3.5 w-3.5" /> {j.dropCity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-semibold text-harvest">{formatMoney(j.payoutCents)}</p>
                  <p className="text-[11px] font-bold tracking-wide text-cream/40 uppercase">payout</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full border border-cream/15 px-3 py-1.5 text-cream/75">
                  {j.distanceKm.toFixed(1)} km route
                </span>
                <span className="rounded-full border border-cream/15 px-3 py-1.5 text-cream/75">
                  {j.itemCount} item{j.itemCount > 1 ? "s" : ""}
                </span>
                <span className="rounded-full border border-cream/15 px-3 py-1.5 text-cream/75">
                  {j.stops} pickup stop{j.stops > 1 ? "s" : ""}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-dashed border-cream/20 px-4 py-3 text-xs font-semibold text-cream/50">
                <Lock className="h-3.5 w-3.5 shrink-0 text-harvest" />
                Exact farm address and drop-off unlock the moment you accept.
              </div>

              <div className="mt-5 flex gap-2.5">
                <Button
                  variant="harvest"
                  className="flex-1"
                  loading={busyId === j.id}
                  onClick={() => accept(j)}
                >
                  <Truck className="h-4 w-4" /> Accept delivery
                </Button>
                <Button
                  variant="outlineLight"
                  loading={busyId === j.id}
                  onClick={() => reject(j)}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "active" && !active && (
        <div className="mt-7 [&>div]:border-cream/20">
          <EmptyState
            icon={Package}
            title="Nothing on your truck"
            body="Accept a delivery from the board and the route, contacts, and checklist appear here."
            action={
              <Button variant="harvest" onClick={() => setTab("board")}>
                Open the board
              </Button>
            }
          />
        </div>
      )}

      {tab === "active" && active && (
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <LiveMap
              theme="dark"
              pickup={
                active.pickups[0]
                  ? { lat: active.pickups[0].lat, lng: active.pickups[0].lng, label: active.pickups[0].name }
                  : null
              }
              dropoff={
                active.dropoff
                  ? { lat: active.dropoff.lat, lng: active.dropoff.lng, label: active.dropoff.label }
                  : { lat: 0, lng: 0, label: "Drop-off" }
              }
              driverPos={driverPos}
            />
            {active.status === "picked_up" && (
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-cream/60">
                <Navigation className="h-3.5 w-3.5 text-harvest" />
                Sharing your live position with the customer · {Math.round(prog * 100)}% of the route
              </p>
            )}

            {/* revealed addresses */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {active.pickups.map((p) => (
                <div key={p.name} className="rounded-2xl border border-cream/12 bg-cream/[0.05] p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] text-sage uppercase">
                    <Sprout className="h-3.5 w-3.5" /> Pickup
                  </p>
                  <p className="mt-2 text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-cream/55">{p.address}, {p.city}</p>
                </div>
              ))}
              {active.dropoff && (
                <div className="rounded-2xl border border-cream/12 bg-cream/[0.05] p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] text-sage uppercase">
                    <MapPin className="h-3.5 w-3.5" /> Drop-off
                  </p>
                  <p className="mt-2 text-sm font-bold">{active.dropoff.label}</p>
                  <p className="text-xs text-cream/55">
                    {active.dropoff.line1}, {active.dropoff.city}, {active.dropoff.state} {active.dropoff.zip}
                  </p>
                </div>
              )}
            </div>

            {/* comms */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              {active.customer?.phone && (
                <a href={`tel:${active.customer.phone}`}>
                  <Button size="sm" variant="harvest">
                    <Phone className="h-3.5 w-3.5" /> Call {active.customer.name.split(" ")[0]}
                  </Button>
                </a>
              )}
              {active.pickups[0]?.contactPhone && (
                <a href={`tel:${active.pickups[0].contactPhone}`}>
                  <Button size="sm" variant="outlineLight">
                    <Phone className="h-3.5 w-3.5" /> Call {active.pickups[0].name}
                  </Button>
                </a>
              )}
              <a href="mailto:drivers@farmdirect.co?subject=Driver%20support">
                <Button size="sm" variant="outlineLight">
                  <Headset className="h-3.5 w-3.5" /> Driver support
                </Button>
              </a>
            </div>
          </div>

          {/* right rail */}
          <div className="space-y-5">
            <div className="rounded-[24px] border border-cream/12 bg-cream/[0.05] p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold tracking-[0.16em] text-cream/40 uppercase">
                  {shortId(active.orderId)}
                </p>
                <span className="rounded-full bg-harvest/15 px-3 py-1 text-xs font-bold text-harvest">
                  {active.status === "accepted" ? "Head to pickup" : "Delivering"}
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="font-display text-4xl font-semibold text-harvest">{formatMoney(active.payoutCents)}</p>
                  <p className="text-xs font-semibold text-cream/45">on completion</p>
                </div>
                <p className="text-sm font-bold text-cream/70">{active.distanceKm.toFixed(1)} km</p>
              </div>
            </div>

            {/* collection checklist */}
            <div className="rounded-[24px] border border-cream/12 bg-cream/[0.05] p-6">
              <p className="text-[11px] font-bold tracking-[0.16em] text-cream/40 uppercase">
                Collect from the farm{active.pickups.length > 1 ? "s" : ""}
              </p>
              <ul className="mt-3 space-y-2">
                {active.items.map((i) => (
                  <li key={i.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-cream/10 px-3.5 py-2.5 transition hover:border-cream/30">
                      <input
                        type="checkbox"
                        checked={!!collected[i.id]}
                        onChange={(e) => setCollected({ ...collected, [i.id]: e.target.checked })}
                        className="h-4 w-4 accent-harvest"
                      />
                      <span className={cn("text-sm font-semibold", collected[i.id] && "text-cream/40 line-through")}>
                        {i.quantity}× {i.name}
                      </span>
                      <span className="ml-auto text-xs text-cream/40">{i.unit}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-cream/45">
                Customer pays online — no cash changes hands. Total order value {formatMoney(active.totalCents)}.
              </p>
            </div>

            {/* stage actions */}
            {active.status === "accepted" && (
              <Button variant="harvest" size="lg" className="w-full" loading={busyId === active.id} onClick={pickup}>
                <Package className="h-4.5 w-4.5" /> Confirm pickup & start route
              </Button>
            )}

            {active.status === "picked_up" && (
              <div className="rounded-[24px] border border-harvest/30 bg-harvest/10 p-6">
                <p className="flex items-center gap-2 text-sm font-bold text-harvest">
                  <Camera className="h-4.5 w-4.5" /> Proof of delivery
                </p>
                <p className="mt-1 text-xs text-cream/55">
                  Snap the package at the customer&rsquo;s door to complete this delivery.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setPhoto(await fileToDataUrl(f));
                  }}
                />
                {photo ? (
                  <div className="relative mt-4">
                    <img src={photo} alt="Drop-off proof" className="max-h-48 w-full rounded-2xl object-cover" />
                    <button
                      onClick={() => setPhoto(null)}
                      className="absolute top-2 right-2 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-forest-950/80 text-cream"
                      aria-label="Retake photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="mt-4 flex w-full cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-cream/25 py-8 transition hover:border-harvest"
                  >
                    <Camera className="h-6 w-6 text-cream/60" />
                    <span className="mt-2 text-xs font-bold text-cream/60">Tap to photograph the drop-off</span>
                  </button>
                )}
                <Button
                  variant="harvest"
                  size="lg"
                  className="mt-4 w-full"
                  disabled={!photo}
                  loading={completing}
                  onClick={complete}
                >
                  <Check className="h-4.5 w-4.5" /> Complete delivery · {formatMoney(active.payoutCents)}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
