import { db } from "@/db";
import {
  addresses,
  deliveries,
  farms,
  orderItems,
  orders,
  products,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { haversineKm } from "@/lib/geo";
import { listCustomerOrders, notify } from "@/lib/queries";
import { firstName } from "@/lib/utils";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "customer")
    return Response.json({ error: "Forbidden." }, { status: 403 });
  return Response.json({ orders: await listCustomerOrders(user.id) });
}

/**
 * Checkout. Runs inside a single transaction that atomically deducts stock
 * (quantity = quantity - n WHERE quantity >= n) — the inventory auto-update —
 * then creates the order, line items, a pending delivery and notifies each
 * affected farmer. Any failure rolls everything back.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "customer")
    return Response.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json();
  const addressId = String(body.addressId ?? "");
  const items: { productId: string; quantity: number }[] = Array.isArray(body.items)
    ? body.items
    : [];
  if (!addressId) return Response.json({ error: "Choose a delivery address." }, { status: 400 });
  if (items.length === 0 || items.length > 25)
    return Response.json({ error: "Your cart is empty." }, { status: 400 });
  for (const it of items) {
    if (!it.productId || !Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 99)
      return Response.json({ error: "Invalid cart contents." }, { status: 400 });
  }

  const [addr] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id)));
  if (!addr) return Response.json({ error: "Address not found." }, { status: 404 });

  const ids = [...new Set(items.map((i) => i.productId))];
  const rows = await db
    .select({ p: products, f: farms })
    .from(products)
    .innerJoin(farms, eq(products.farmId, farms.id))
    .where(inArray(products.id, ids));
  const byId = new Map(rows.map((r) => [r.p.id, r]));
  for (const it of items) {
    if (!byId.has(it.productId))
      return Response.json({ error: "A product in your cart no longer exists." }, { status: 409 });
  }

  const subtotal = items.reduce((s, it) => s + byId.get(it.productId)!.p.priceCents * it.quantity, 0);
  const deliveryFee = 499;
  const total = subtotal + deliveryFee;

  // headline distance: first farm → drop-off (with a road-factor), sets driver payout
  const firstFarm = rows[0]?.f;
  const km = firstFarm ? Math.max(1.2, haversineKm(firstFarm, addr) * 1.35) : 3;
  const payout = Math.round(375 + km * 118);

  try {
    const orderId = await db.transaction(async (tx) => {
      // atomic stock deduction — mirrors the Supabase inventory trigger
      for (const it of items) {
        const updated = await tx
          .update(products)
          .set({ quantity: sql`${products.quantity} - ${it.quantity}` })
          .where(and(eq(products.id, it.productId), gte(products.quantity, it.quantity)))
          .returning({ name: products.name });
        if (updated.length === 0) {
          throw new Error(`INSUFFICIENT:${byId.get(it.productId)!.p.name}`);
        }
      }

      const [o] = await tx
        .insert(orders)
        .values({
          customerId: user.id,
          addressId: addr.id,
          subtotalCents: subtotal,
          deliveryFeeCents: deliveryFee,
          totalCents: total,
        })
        .returning();

      await tx.insert(orderItems).values(
        items.map((it) => {
          const { p } = byId.get(it.productId)!;
          return {
            orderId: o.id,
            productId: p.id,
            farmId: p.farmId,
            name: p.name,
            unit: p.unit,
            quantity: it.quantity,
            priceCents: p.priceCents,
            imageUrl: p.imageUrl,
          };
        })
      );

      await tx.insert(deliveries).values({
        orderId: o.id,
        payoutCents: payout,
        distanceKm: km,
      });

      // notify each farm owner about their part of the order
      const byFarm = new Map<string, { owner: string; parts: string[] }>();
      for (const it of items) {
        const { p, f } = byId.get(it.productId)!;
        const entry = byFarm.get(f.id) ?? { owner: f.ownerId, parts: [] };
        entry.parts.push(`${it.quantity}× ${p.name}`);
        byFarm.set(f.id, entry);
      }
      for (const [, v] of byFarm) {
        await notify(
          v.owner,
          "New order received",
          `${firstName(user.name)} ordered ${v.parts.join(", ")}. Have it packed and ready for pickup.`,
          "order",
          tx
        );
      }
      return o.id;
    });

    return Response.json({ ok: true, orderId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("INSUFFICIENT:")) {
      return Response.json(
        { error: `Not enough stock for “${msg.slice(13)}”. Update your cart and try again.` },
        { status: 409 }
      );
    }
    console.error("checkout", e);
    return Response.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}
