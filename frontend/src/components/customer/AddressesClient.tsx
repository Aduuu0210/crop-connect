"use client";

import { Badge, Button, EmptyState, Field, Input, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Briefcase, Home, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Addr = {
  id: string;
  label: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
};

const emptyForm = { label: "", line1: "", city: "", state: "", zip: "", isDefault: false };

function labelIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("work") || l.includes("office") || l.includes("studio")) return Briefcase;
  return Home;
}

export function AddressesClient({ addresses }: { addresses: Addr[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<"closed" | "add" | "edit">("closed");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setModal("add");
  };

  const openEdit = (a: Addr) => {
    setForm({ label: a.label, line1: a.line1, city: a.city, state: a.state, zip: a.zip, isDefault: a.isDefault });
    setEditingId(a.id);
    setError("");
    setModal("edit");
  };

  const save = async () => {
    setBusy(true);
    setError("");
    const { authFetch } = await import("@/lib/clientAuth");
    const res = await authFetch(modal === "edit" ? `/api/addresses/${editingId}` : "/api/addresses", {
      method: modal === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save address.");
      return;
    }
    setModal("closed");
    router.refresh();
  };

  const remove = async (id: string) => {
    setBusy(true);
    const { authFetch } = await import("@/lib/clientAuth");
    const res = await authFetch(`/api/addresses/${id}`, { method: "DELETE" });
    setBusy(false);
    setConfirmDelete(null);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Could not delete address.");
    }
    router.refresh();
  };

  const makeDefault = async (a: Addr) => {
    const { authFetch } = await import("@/lib/clientAuth");
    await authFetch(`/api/addresses/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    router.refresh();
  };

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => {
          const Icon = labelIcon(a.label);
          return (
            <article
              key={a.id}
              className={cn(
                "group relative rounded-[24px] border bg-white/70 p-6 transition-all duration-300 hover:-translate-y-0.5",
                a.isDefault ? "border-forest-900 shadow-[0_18px_36px_-20px_rgba(12,35,22,0.35)]" : "border-ink/10"
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn("grid h-11 w-11 place-items-center rounded-2xl", a.isDefault ? "bg-forest-900 text-cream" : "bg-forest-900/6 text-forest-800")}>
                  <Icon className="h-5 w-5" />
                </span>
                {a.isDefault && <Badge tone="leaf">Default</Badge>}
              </div>
              <h3 className="font-display mt-4 text-xl font-semibold">{a.label}</h3>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-ink/60">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {a.line1}, {a.city}, {a.state} {a.zip}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                {!a.isDefault && (
                  <Button size="sm" variant="ghost" onClick={() => makeDefault(a)}>
                    <Star className="h-3.5 w-3.5" /> Make default
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => setConfirmDelete(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          );
        })}

        {/* add card */}
        <button
          onClick={openAdd}
          className="group flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-ink/20 p-6 transition-all duration-300 hover:border-harvest hover:bg-harvest/5"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-forest-900/6 transition-colors group-hover:bg-harvest group-hover:text-forest-950">
            <Plus className="h-5 w-5" />
          </span>
          <span className="mt-3 text-sm font-bold">Add a new address</span>
          <span className="mt-1 text-xs text-ink/50">Home, work, the in-laws&rsquo; porch…</span>
        </button>
      </div>

      {addresses.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={MapPin}
            title="No addresses yet"
            body="Save your first delivery spot — you'll pick from these at checkout."
          />
        </div>
      )}

      {/* add/edit modal */}
      <Modal open={modal !== "closed"} onClose={() => setModal("closed")} title={modal === "edit" ? "Edit address" : "New address"}>
        <div className="space-y-4">
          <Field label="Label">
            <Input placeholder="Home, Work, Cabin…" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </Field>
          <Field label="Street address">
            <Input placeholder="1214 NW Flanders St" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          </Field>
          <div className="grid grid-cols-[1.4fr_0.7fr_0.9fr] gap-3">
            <Field label="City">
              <Input placeholder="New Delhi" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="State">
              <Input placeholder="OR" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Field>
            <Field label="ZIP">
              <Input placeholder="97209" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="h-4 w-4 accent-harvest"
            />
            Make this my default delivery address
          </label>
          {error && (
            <p className="rounded-xl border border-clay/25 bg-clay/10 px-3 py-2 text-xs font-semibold text-clay">{error}</p>
          )}
          <div className="flex gap-2.5 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setModal("closed")}>
              Cancel
            </Button>
            <Button variant="harvest" className="flex-1" loading={busy} onClick={save}>
              Save address
            </Button>
          </div>
        </div>
      </Modal>

      {/* delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove this address?">
        <p className="text-sm text-ink/60">
          Past orders keep their delivery details, but this address won&rsquo;t be offered at
          checkout anymore.
        </p>
        <div className="mt-5 flex gap-2.5">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button variant="danger" className="flex-1" loading={busy} onClick={() => confirmDelete && remove(confirmDelete)}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        </div>
      </Modal>
    </>
  );
}
