"use client";

import { Badge, Button, EmptyState, Field, Input, Modal, Select, Stars, Textarea } from "@/components/ui";
import type { getFarmerData, listNotifications } from "@/lib/queries";
import { cn, formatMoney, harvestLabel, shortId, timeAgo } from "@/lib/utils";
import {
  Banknote,
  Bell,
  BellRing,
  Camera,
  Check,
  ClipboardList,
  Leaf,
  MapPin,
  Package,
  Pencil,
  Plus,
  ShoppingBasket,
  Sprout,
  Star,
  Store,
  Trash2,
  Tractor,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type FarmerData = Awaited<ReturnType<typeof getFarmerData>>;
type ProductRow = NonNullable<FarmerData["products"]>[number];
type Notifs = Awaited<ReturnType<typeof listNotifications>>;

const UNITS = ["each", "kg", "bunch", "dozen", "500ml", "g", "pack", "L", "bag"];

const emptyProduct = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  unit: "each",
  harvestedAt: new Date().toISOString().slice(0, 10),
  imageUrl: "",
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
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

export function FarmerClient({
  initialData,
  initialNotifs,
  userName,
}: {
  initialData: FarmerData;
  initialNotifs: Notifs;
  userName: string;
}) {
  const router = useRouter();
  const data = initialData;
  const onboarded = !!data.farm;
  const [tab, setTab] = useState<"overview" | "inventory" | "farm">(onboarded ? "overview" : "farm");
  const [notifs, setNotifs] = useState(initialNotifs);

  const refreshNotifs = useCallback(async () => {
    try {
      const { authFetch } = await import("@/lib/clientAuth");
      const res = await authFetch("/api/notifications", { cache: "no-store" });
      if (res.ok) setNotifs(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(refreshNotifs, 5000);
    return () => clearInterval(t);
  }, [refreshNotifs]);

  const markAllRead = async () => {
    const { authFetch } = await import("@/lib/clientAuth");
    await authFetch("/api/notifications", { method: "PATCH" });
    refreshNotifs();
  };

  const stats = [
    { icon: Banknote, label: "Revenue delivered", value: formatMoney(data.stats.revenueCents) },
    { icon: ClipboardList, label: "Lifetime orders", value: String(data.stats.orderCount) },
    { icon: ShoppingBasket, label: "Live listings", value: String(data.stats.activeProducts) },
    { icon: Star, label: "Avg. produce rating", value: data.stats.avgRating ? `${data.stats.avgRating}` : "—" },
  ];

  return (
    <div>
      {/* header */}
      <div className="fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.22em] text-moss uppercase">
            {onboarded ? data.farm!.city : "Welcome aboard"}
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {onboarded ? data.farm!.name : `Set up your farm, ${userName.split(" ")[0]}`}
          </h1>
        </div>
        {onboarded && (
          <div className="flex rounded-full border border-ink/12 bg-white/60 p-1">
            {(
              [
                { key: "overview", label: "Overview" },
                { key: "inventory", label: "Inventory" },
                { key: "farm", label: "Farm profile" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "cursor-pointer rounded-full px-5 py-2 text-sm font-bold transition-all",
                  tab === t.key ? "bg-forest-900 text-cream" : "text-ink/55 hover:text-ink"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!onboarded ? (
        <FarmOnboarding onSaved={() => router.refresh()} />
      ) : (
        <>
          {tab === "overview" && (
            <div className="fade-up mt-8">
              {/* stats */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-[24px] border border-ink/10 bg-white/70 p-6">
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest-900/7 text-forest-800">
                        <s.icon className="h-5 w-5" />
                      </span>
                    </div>
                    <p className="font-display mt-4 text-3xl font-semibold">{s.value}</p>
                    <p className="mt-0.5 text-xs font-bold tracking-wide text-ink/45 uppercase">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                {/* notifications */}
                <section className="rounded-[26px] border border-ink/10 bg-white/70 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                      {notifs.unread > 0 ? (
                        <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-harvest/15">
                          <BellRing className="h-4 w-4 text-harvest-600" />
                          <span className="pulse-dot absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-harvest text-harvest" />
                        </span>
                      ) : (
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-forest-900/7">
                          <Bell className="h-4 w-4 text-forest-800" />
                        </span>
                      )}
                      Order alerts
                    </h2>
                    {notifs.unread > 0 && (
                      <button onClick={markAllRead} className="link-underline cursor-pointer text-xs font-bold text-ink/60">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <ul className="mt-4 max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                    {notifs.items.length === 0 && (
                      <li className="rounded-2xl border border-dashed border-ink/20 px-4 py-8 text-center text-sm text-ink/50">
                        When a customer orders your produce, it lands here instantly.
                      </li>
                    )}
                    {notifs.items.map((n) => (
                      <li
                        key={n.id}
                        className={cn(
                          "rounded-2xl border px-4 py-3 transition-colors",
                          n.read ? "border-ink/8 bg-white/50" : "border-harvest/30 bg-harvest/8"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("grid h-6 w-6 place-items-center rounded-lg", n.type === "order" ? "bg-harvest/20 text-harvest-600" : "bg-leaf/20 text-moss")}>
                            {n.type === "order" ? <ShoppingBasket className="h-3 w-3" /> : <Sprout className="h-3 w-3" />}
                          </span>
                          <p className="text-sm font-bold">{n.title}</p>
                          <span className="ml-auto text-[10px] font-semibold text-ink/40">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="mt-1 pl-8 text-xs leading-relaxed text-ink/60">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* recent orders */}
                <section className="rounded-[26px] border border-ink/10 bg-white/70 p-6">
                  <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-forest-900/7">
                      <ClipboardList className="h-4 w-4 text-forest-800" />
                    </span>
                    Recent orders
                  </h2>
                  {data.orders.length === 0 ? (
                    <div className="mt-4">
                      <EmptyState
                        icon={ShoppingBasket}
                        title="No orders yet"
                        body="List your first products and neighbors can start ordering your harvest."
                      />
                    </div>
                  ) : (
                    <ul className="mt-4 max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                      {data.orders.map((o) => (
                        <li key={o.id} className="rounded-2xl border border-ink/8 bg-white/60 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold">{shortId(o.id)}</p>
                            <Badge tone={o.status === "delivered" ? "leaf" : o.status === "placed" ? "clay" : "harvest"}>
                              {o.status.replaceAll("_", " ")}
                            </Badge>
                            <span className="ml-auto text-xs font-semibold text-ink/45">
                              {o.customerName} · {timeAgo(o.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-ink/60">
                            {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-sm font-bold">{formatMoney(o.lineTotalCents)}</p>
                            {o.productRating ? <Stars value={o.productRating} size={14} /> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )}

          {tab === "inventory" && <Inventory data={data} />}

          {tab === "farm" && <FarmProfile data={data} onSaved={() => router.refresh()} />}
        </>
      )}
    </div>
  );
}

/* ------------------------------- onboarding ------------------------------- */

function FarmOnboarding({ onSaved }: { onSaved: () => void }) {
  return (
    <div className="fade-up mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="relative overflow-hidden rounded-[28px] bg-forest-950 p-10 text-cream">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-harvest/15 blur-[90px]" />
        <Tractor className="h-10 w-10 text-harvest" />
        <h2 className="font-display mt-6 text-3xl font-semibold tracking-tight">
          Your stand is open before you finish this form.
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/65">
          Tell neighbors who you are and where the good stuff grows. Once your profile is live,
          you can list products with real photos, harvest dates, quantities and prices — and
          orders will start pinging this dashboard.
        </p>
        <ul className="mt-8 space-y-3">
          {["Inventory deducts itself automatically at checkout", "Real-time alerts on every order and delivery", "Customers rate every batch — great produce wins"].map((t) => (
            <li key={t} className="flex items-center gap-3 text-sm text-cream/80">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-leaf/20">
                <Check className="h-3.5 w-3.5 text-sage" />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <FarmForm onSaved={onSaved} />
    </div>
  );
}

function FarmProfile({ data, onSaved }: { data: FarmerData; onSaved: () => void }) {
  return (
    <div className="fade-up mt-8 max-w-xl">
      <FarmForm initial={data.farm ?? undefined} onSaved={onSaved} />
    </div>
  );
}

function FarmForm({
  initial,
  onSaved,
}: {
  initial?: { name: string; description: string; address: string; city: string };
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setError("");
    setSaved(false);
    const { authFetch } = await import("@/lib/clientAuth");
    const res = await authFetch("/api/farm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save.");
      return;
    }
    setSaved(true);
    onSaved();
  };

  return (
    <div className="rounded-[26px] border border-ink/10 bg-white/70 p-6 sm:p-8">
      <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
        <Store className="h-5 w-5 text-forest-800" /> Farm profile
      </h2>
      <div className="mt-6 space-y-4">
        <Field label="Farm name">
          <Input placeholder="Green Valley Organics" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Story & description">
          <Textarea
            placeholder="Third-generation family farm growing heirloom varieties without sprays…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Street address" hint="Shown to drivers only after they accept a pickup.">
            <Input placeholder="18400 S Redland Rd" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="City">
            <Input placeholder="Oregon City, OR" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
        </div>
        {error && <p className="rounded-xl border border-clay/25 bg-clay/10 px-3 py-2 text-xs font-semibold text-clay">{error}</p>}
        <div className="flex items-center gap-3">
          <Button variant="harvest" size="lg" loading={busy} onClick={save}>
            <Leaf className="h-4 w-4" /> {initial ? "Save changes" : "Open my farm stand"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-bold text-moss">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- inventory ------------------------------- */

function Inventory({ data }: { data: FarmerData }) {
  const router = useRouter();
  const [modal, setModal] = useState<"closed" | "add" | "edit">("closed");
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<ProductRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setForm(emptyProduct);
    setEditingId(null);
    setError("");
    setModal("add");
  };

  const openEdit = (p: ProductRow) => {
    setForm({
      name: p.name,
      description: p.description,
      price: (p.priceCents / 100).toFixed(2),
      quantity: String(p.quantity),
      unit: p.unit,
      harvestedAt: p.harvestedAt ? p.harvestedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      imageUrl: p.imageUrl,
    });
    setEditingId(p.id);
    setError("");
    setModal("edit");
  };

  const save = async () => {
    setBusy(true);
    setError("");
    const payload = {
      name: form.name,
      description: form.description,
      priceCents: Math.round(parseFloat(form.price || "0") * 100),
      quantity: parseInt(form.quantity || "0", 10),
      unit: form.unit,
      harvestedAt: form.harvestedAt,
      imageUrl: form.imageUrl,
    };
    const { authFetch } = await import("@/lib/clientAuth");
    const res = await authFetch(modal === "edit" ? `/api/products/${editingId}` : "/api/products", {
      method: modal === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const resp = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(resp.error ?? "Could not save product.");
      return;
    }
    setModal("closed");
    router.refresh();
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    const { authFetch } = await import("@/lib/clientAuth");
    await authFetch(`/api/products/${confirmDelete.id}`, { method: "DELETE" });
    setBusy(false);
    setConfirmDelete(null);
    router.refresh();
  };

  return (
    <div className="fade-up mt-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/55">
          {data.products.length} product{data.products.length === 1 ? "" : "s"} listed under{" "}
          <span className="font-bold text-ink">{data.farm?.name}</span>
        </p>
        <Button variant="forest" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </div>

      {data.products.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Package}
            title="Your shelves are empty"
            body="Add your first product — a real photo and an honest harvest date go a long way."
            action={
              <Button variant="harvest" onClick={openAdd}>
                <Plus className="h-4 w-4" /> List your first product
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.products.map((p) => (
            <article key={p.id} className="group flex flex-col overflow-hidden rounded-[24px] border border-ink/10 bg-white/70">
              <div className="relative">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center bg-parchment">
                    <Sprout className="h-10 w-10 text-moss/40" />
                  </div>
                )}
                {p.quantity === 0 ? (
                  <span className="absolute top-3 right-3 rounded-full bg-clay px-3 py-1.5 text-[10px] font-bold text-cream uppercase tracking-wide">Sold out</span>
                ) : p.quantity <= 5 ? (
                  <span className="absolute top-3 right-3 rounded-full bg-harvest px-3 py-1.5 text-[10px] font-bold text-forest-950 uppercase tracking-wide">Low · {p.quantity}</span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg leading-snug font-semibold">{p.name}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/50">
                  <Sprout className="h-3 w-3" /> {harvestLabel(p.harvestedAt)}
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-bold">{formatMoney(p.priceCents)} <span className="text-xs font-semibold text-ink/45">/ {p.unit}</span></span>
                  <span className="font-semibold text-ink/60">{p.quantity} in stock</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmDelete(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* product modal */}
      <Modal open={modal !== "closed"} onClose={() => setModal("closed")} title={modal === "edit" ? "Edit product" : "New product"} wide>
        <div className="grid gap-6 sm:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="mb-1.5 block text-[11px] font-bold tracking-[0.14em] text-ink/60 uppercase">Real product photo</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = await fileToDataUrl(f);
                  setForm((prev) => ({ ...prev, imageUrl: url }));
                }
              }}
            />
            {form.imageUrl ? (
              <div className="relative">
                <img src={form.imageUrl} alt="Product" className="aspect-[4/3] w-full rounded-2xl object-cover" />
                <button
                  onClick={() => setForm({ ...form, imageUrl: "" })}
                  className="absolute top-2 right-2 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-forest-950/80 text-cream"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/25 transition hover:border-harvest"
              >
                <Camera className="h-7 w-7 text-ink/40" />
                <span className="mt-2 text-xs font-bold text-ink/50">Upload a photo of this batch</span>
                <span className="mt-1 text-[10px] text-ink/40">Customers buy with their eyes</span>
              </button>
            )}
          </div>
          <div className="space-y-4">
            <Field label="Product name">
              <Input placeholder="Heirloom Tomatoes" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Description">
              <Textarea placeholder="Vine-ripened cherokee purples and brandywines…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹)">
                <Input type="number" min="0" step="0.01" placeholder="420.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </Field>
              <Field label="Per unit">
                <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Available quantity">
                <Input type="number" min="0" step="1" placeholder="24" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </Field>
              <Field label="Harvest date">
                <Input type="date" value={form.harvestedAt} onChange={(e) => setForm({ ...form, harvestedAt: e.target.value })} />
              </Field>
            </div>
            {error && <p className="rounded-xl border border-clay/25 bg-clay/10 px-3 py-2 text-xs font-semibold text-clay">{error}</p>}
            <div className="flex gap-2.5">
              <Button variant="outline" className="flex-1" onClick={() => setModal("closed")}>Cancel</Button>
              <Button variant="harvest" className="flex-1" loading={busy} onClick={save}>
                {modal === "edit" ? "Save changes" : "List product"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={`Remove “${confirmDelete?.name}”?`}>
        <p className="text-sm text-ink/60">
          The listing disappears from the market immediately. Past orders keep their records.
        </p>
        <div className="mt-5 flex gap-2.5">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Keep it</Button>
          <Button variant="danger" className="flex-1" loading={busy} onClick={remove}>
            <Trash2 className="h-4 w-4" /> Remove listing
          </Button>
        </div>
      </Modal>
    </div>
  );
}
