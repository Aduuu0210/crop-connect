import { db } from "@/db";
import { deliveries, farms, orderItems, orders } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/queries";
import { firstName } from "@/lib/utils";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

async function farmerOwnersFor(orderId: string) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const farmIds = [...new Set(items.map((i) => i.farmId).filter((x): x is string => !!x))];
  if (!farmIds.length) return [];
  const farmRows = await db.select().from(farms).where(inArray(farms.id, farmIds));
  return farmRows.map((f) => f.ownerId);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "driver")
    return Response.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const action = String(body.action ?? "");

  const [d] = await db.select().from(deliveries).where(eq(deliveries.id, id));
  if (!d) return Response.json({ error: "Delivery not found." }, { status: 404 });

  switch (action) {
    case "accept": {
      // atomic claim — first driver to accept wins
      const claimed = await db
        .update(deliveries)
        .set({ driverId: user.id, status: "accepted", acceptedAt: new Date() })
        .where(
          and(eq(deliveries.id, id), eq(deliveries.status, "pending"), isNull(deliveries.driverId))
        )
        .returning();
      if (claimed.length === 0)
        return Response.json({ error: "This delivery was just taken by another driver." }, { status: 409 });
      await db.update(orders).set({ status: "driver_assigned" }).where(eq(orders.id, d.orderId));
      const [o] = await db.select().from(orders).where(eq(orders.id, d.orderId));
      if (o) {
        await notify(
          o.customerId,
          "Driver assigned",
          `${firstName(user.name)} accepted your delivery and is heading to the farm for pickup.`,
          "delivery"
        );
        for (const ownerId of await farmerOwnersFor(d.orderId)) {
          await notify(ownerId, "Driver assigned", `${firstName(user.name)} is on the way to collect the order. Please have it packed.`, "delivery");
        }
      }
      return Response.json({ ok: true });
    }

    case "reject": {
      if (d.status !== "pending")
        return Response.json({ error: "This delivery is no longer available." }, { status: 409 });
      await db
        .update(deliveries)
        .set({ rejectedBy: sql`array_append(${deliveries.rejectedBy}, ${user.id})` })
        .where(eq(deliveries.id, id));
      return Response.json({ ok: true });
    }

    case "pickup": {
      if (d.driverId !== user.id) return Response.json({ error: "Forbidden." }, { status: 403 });
      if (d.status !== "accepted")
        return Response.json({ error: "This delivery can't be picked up right now." }, { status: 409 });
      await db
        .update(deliveries)
        .set({ status: "picked_up", pickedUpAt: new Date() })
        .where(eq(deliveries.id, id));
      await db.update(orders).set({ status: "in_transit" }).where(eq(orders.id, d.orderId));
      const [o] = await db.select().from(orders).where(eq(orders.id, d.orderId));
      if (o) {
        await notify(
          o.customerId,
          "Order on the way",
          `${firstName(user.name)} has picked up your order. Watch it live on the map.`,
          "delivery"
        );
      }
      return Response.json({ ok: true });
    }

    case "location": {
      if (d.driverId !== user.id) return Response.json({ error: "Forbidden." }, { status: 403 });
      if (!["accepted", "picked_up"].includes(d.status))
        return Response.json({ error: "Delivery is not active." }, { status: 409 });
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const progress = Math.max(0, Math.min(1, Number(body.progress) || 0));
      if (!Number.isFinite(lat) || !Number.isFinite(lng))
        return Response.json({ error: "Invalid coordinates." }, { status: 400 });
      await db
        .update(deliveries)
        .set({ driverLat: lat, driverLng: lng, progress })
        .where(eq(deliveries.id, id));
      return Response.json({ ok: true });
    }

    case "complete": {
      if (d.driverId !== user.id) return Response.json({ error: "Forbidden." }, { status: 403 });
      if (d.status !== "picked_up")
        return Response.json({ error: "Pick up the order before completing it." }, { status: 409 });
      const photo = String(body.photo ?? "");
      if (!photo.startsWith("data:image") || photo.length > 5_000_000)
        return Response.json({ error: "A drop-off photo is required to complete the delivery." }, { status: 400 });
      await db
        .update(deliveries)
        .set({ status: "delivered", deliveredAt: new Date(), proofPhoto: photo, progress: 1 })
        .where(eq(deliveries.id, id));
      await db.update(orders).set({ status: "delivered" }).where(eq(orders.id, d.orderId));
      const [o] = await db.select().from(orders).where(eq(orders.id, d.orderId));
      if (o) {
        await notify(
          o.customerId,
          "Order delivered",
          "Your order was delivered. Enjoy — and don't forget to rate your experience.",
          "delivery"
        );
        for (const ownerId of await farmerOwnersFor(d.orderId)) {
          await notify(ownerId, "Order delivered", "One of your orders was successfully delivered to the customer.", "order");
        }
      }
      return Response.json({ ok: true });
    }

    default:
      return Response.json({ error: "Unknown action." }, { status: 400 });
  }
}
