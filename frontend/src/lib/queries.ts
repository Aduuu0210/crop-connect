import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  addresses,
  deliveries,
  farms,
  feedback,
  notifications,
  orderItems,
  orders,
  products,
  users,
} from "@/db/schema";
import { firstName } from "./utils";

/**
 * Shared data layer. Every function scopes its queries to a specific user /
 * role — this is the application's row-level-security boundary. Shapes that
 * cross role lines (e.g. a driver seeing a drop-off address) are only
 * produced after the relationship that authorizes them is verified.
 */

export async function notify(
  userId: string,
  title: string,
  body: string,
  type: "order" | "delivery" | "info" = "info",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any = db
) {
  await tx.insert(notifications).values({ userId, title, body, type });
}

/* ---------------------------------- market --------------------------------- */

export async function listMarketProducts() {
  const rows = await db
    .select({ p: products, f: farms })
    .from(products)
    .innerJoin(farms, eq(products.farmId, farms.id))
    .where(gt(products.quantity, 0))
    .orderBy(farms.name, products.name);
  return rows.map(({ p, f }) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    priceCents: p.priceCents,
    quantity: p.quantity,
    unit: p.unit,
    harvestedAt: p.harvestedAt ? p.harvestedAt.toISOString() : null,
    farm: { id: f.id, name: f.name, city: f.city },
  }));
}

export type MarketProduct = Awaited<ReturnType<typeof listMarketProducts>>[number];

/* --------------------------------- customer -------------------------------- */

export async function listCustomerOrders(customerId: string) {
  const ords = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt));
  if (ords.length === 0) return [];

  const orderIds = ords.map((o) => o.id);
  const [itemRows, deliveryRows, addressRows, feedbackRows] = await Promise.all([
    db
      .select({ it: orderItems, farmName: farms.name })
      .from(orderItems)
      .leftJoin(farms, eq(orderItems.farmId, farms.id))
      .where(inArray(orderItems.orderId, orderIds)),
    db.select().from(deliveries).where(inArray(deliveries.orderId, orderIds)),
    db.select().from(addresses).where(
      inArray(
        addresses.id,
        ords.map((o) => o.addressId)
      )
    ),
    db.select().from(feedback).where(inArray(feedback.orderId, orderIds)),
  ]);

  const driverIds = [
    ...new Set(deliveryRows.filter((d) => d.driverId).map((d) => d.driverId!)),
  ];
  const driverRows = driverIds.length
    ? await db.select().from(users).where(inArray(users.id, driverIds))
    : [];
  const farmIds = [
    ...new Set(itemRows.map((r) => r.it.farmId).filter((x): x is string => !!x)),
  ];
  const farmRows = farmIds.length
    ? await db.select().from(farms).where(inArray(farms.id, farmIds))
    : [];

  const addrById = new Map(addressRows.map((a) => [a.id, a]));
  const delivByOrder = new Map(deliveryRows.map((d) => [d.orderId, d]));
  const fbByOrder = new Map(feedbackRows.map((f) => [f.orderId, f]));
  const driverById = new Map(driverRows.map((d) => [d.id, d]));
  const farmById = new Map(farmRows.map((f) => [f.id, f]));

  return ords.map((o) => {
    const addr = addrById.get(o.addressId);
    const items = itemRows
      .filter((r) => r.it.orderId === o.id)
      .map((r) => ({
        id: r.it.id,
        name: r.it.name,
        unit: r.it.unit,
        quantity: r.it.quantity,
        priceCents: r.it.priceCents,
        imageUrl: r.it.imageUrl,
        farmName: r.farmName ?? "Farm",
      }));
    const d = delivByOrder.get(o.id);

    // Conditional visibility: driver identity + live location are exposed to
    // the customer only once a driver has accepted THIS order.
    let delivery: {
      id: string;
      status: string;
      progress: number;
      driver: { name: string; phone: string | null } | null;
      driverPos: { lat: number; lng: number } | null;
      proofPhoto?: string | null;
      deliveredAt?: string | null;
    } | null = null;
    if (d && d.status !== "pending") {
      const driver = d.driverId ? driverById.get(d.driverId) : undefined;
      delivery = {
        id: d.id,
        status: d.status,
        progress: d.progress,
        driver: driver
          ? { name: driver.name, phone: driver.phone }
          : null,
        driverPos:
          d.driverLat != null && d.driverLng != null && d.status !== "delivered"
            ? { lat: d.driverLat, lng: d.driverLng }
            : null,
        proofPhoto: d.status === "delivered" ? d.proofPhoto : null,
        deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
      };
    } else if (d) {
      delivery = { id: d.id, status: d.status, progress: 0, driver: null, driverPos: null };
    }

    const firstFarmId = itemRows.find((r) => r.it.orderId === o.id && r.it.farmId)?.it.farmId;
    const pickupFarm = firstFarmId ? farmById.get(firstFarmId) : undefined;

    const fb = fbByOrder.get(o.id);
    return {
      id: o.id,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      subtotalCents: o.subtotalCents,
      deliveryFeeCents: o.deliveryFeeCents,
      totalCents: o.totalCents,
      address: addr
        ? {
            label: addr.label,
            line1: addr.line1,
            city: addr.city,
            state: addr.state,
            zip: addr.zip,
            lat: addr.lat,
            lng: addr.lng,
          }
        : null,
      pickup: pickupFarm
        ? { lat: pickupFarm.lat, lng: pickupFarm.lng, label: pickupFarm.name }
        : null,
      items,
      delivery,
      feedback: fb
        ? {
            productRating: fb.productRating,
            driverRating: fb.driverRating,
            comment: fb.comment,
          }
        : null,
    };
  });
}

export type CustomerOrder = Awaited<ReturnType<typeof listCustomerOrders>>[number];

/* ---------------------------------- driver --------------------------------- */

/** Board jobs show distance + area only. Exact pickup/drop-off stay hidden
 *  until the driver accepts (they are absent from this payload entirely). */
export async function getDriverBoard(driverId: string) {
  const pend = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.status, "pending"))
    .orderBy(desc(deliveries.createdAt));
  const mine = pend.filter((d) => !d.rejectedBy.includes(driverId));
  if (mine.length === 0) return [];

  const orderIds = mine.map((d) => d.orderId);
  const ords = await db.select().from(orders).where(inArray(orders.id, orderIds));
  const orderById = new Map(ords.map((o) => [o.id, o]));
  const addrRows = await db.select().from(addresses).where(
    inArray(
      addresses.id,
      ords.map((o) => o.addressId)
    )
  );
  const addrById = new Map(addrRows.map((a) => [a.id, a]));
  const itemRows = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));
  const farmIds = [...new Set(itemRows.map((i) => i.farmId).filter((x): x is string => !!x))];
  const farmRows = farmIds.length
    ? await db.select().from(farms).where(inArray(farms.id, farmIds))
    : [];
  const farmById = new Map(farmRows.map((f) => [f.id, f]));

  return mine
    .map((d) => {
      const o = orderById.get(d.orderId);
      if (!o) return null;
      const addr = addrById.get(o.addressId);
      const items = itemRows.filter((i) => i.orderId === o.id);
      const distinctFarms = [...new Set(items.map((i) => i.farmId).filter(Boolean))] as string[];
      const firstFarm = distinctFarms[0] ? farmById.get(distinctFarms[0]) : undefined;
      const farmNames = distinctFarms
        .map((id) => farmById.get(id)?.name)
        .filter(Boolean)
        .join(" + ");
      return {
        id: d.id,
        orderId: o.id,
        createdAt: d.createdAt.toISOString(),
        itemCount: items.reduce((n, i) => n + i.quantity, 0),
        stops: distinctFarms.length,
        farmNames: farmNames || "Local farm",
        farmCity: firstFarm?.city ?? "",
        dropCity: addr?.city ?? "",
        distanceKm: Math.round(d.distanceKm * 10) / 10,
        payoutCents: d.payoutCents,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export type BoardJob = Awaited<ReturnType<typeof getDriverBoard>>[number];

/** Full detail — only available for a delivery the driver has accepted. */
export async function getDriverActive(driverId: string) {
  const act = await db
    .select()
    .from(deliveries)
    .where(
      and(
        eq(deliveries.driverId, driverId),
        inArray(deliveries.status, ["accepted", "picked_up"])
      )
    )
    .limit(1);
  const d = act[0];
  if (!d) return null;

  const [o] = await db.select().from(orders).where(eq(orders.id, d.orderId));
  if (!o) return null;
  const [addr] = await db.select().from(addresses).where(eq(addresses.id, o.addressId));
  const [customer] = await db.select().from(users).where(eq(users.id, o.customerId));
  const itemRows = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
  const farmIds = [...new Set(itemRows.map((i) => i.farmId).filter((x): x is string => !!x))];
  const farmRows = farmIds.length
    ? await db.select().from(farms).where(inArray(farms.id, farmIds))
    : [];
  const owners = farmRows.length
    ? await db.select().from(users).where(
        inArray(
          users.id,
          farmRows.map((f) => f.ownerId)
        )
      )
    : [];
  const ownerById = new Map(owners.map((u) => [u.id, u]));

  return {
    id: d.id,
    orderId: o.id,
    status: d.status,
    progress: d.progress,
    distanceKm: Math.round(d.distanceKm * 10) / 10,
    payoutCents: d.payoutCents,
    pickups: farmRows.map((f) => {
      const owner = ownerById.get(f.ownerId);
      return {
        name: f.name,
        address: f.address,
        city: f.city,
        lat: f.lat,
        lng: f.lng,
        contactName: owner?.name ?? "",
        contactPhone: owner?.phone ?? "",
      };
    }),
    dropoff: addr
      ? {
          label: addr.label,
          line1: addr.line1,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
          lat: addr.lat,
          lng: addr.lng,
        }
      : null,
    customer: customer
      ? { name: customer.name, phone: customer.phone }
      : null,
    items: itemRows.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    })),
    totalCents: o.totalCents,
  };
}

export type ActiveDelivery = NonNullable<Awaited<ReturnType<typeof getDriverActive>>>;

export async function getDriverStats(driverId: string) {
  const done = await db
    .select()
    .from(deliveries)
    .where(and(eq(deliveries.driverId, driverId), eq(deliveries.status, "delivered")));
  return {
    completed: done.length,
    earningsCents: done.reduce((s, d) => s + d.payoutCents, 0),
  };
}

/* ---------------------------------- farmer --------------------------------- */

export async function getFarmerData(userId: string) {
  const [farm] = await db.select().from(farms).where(eq(farms.ownerId, userId));
  if (!farm) {
    return {
      farm: null,
      products: [],
      orders: [],
      stats: { revenueCents: 0, orderCount: 0, activeProducts: 0, avgRating: null as number | null },
    };
  }
  const prods = await db
    .select()
    .from(products)
    .where(eq(products.farmId, farm.id))
    .orderBy(products.name);
  const itemRows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.farmId, farm.id))
    .orderBy(desc(orderItems.id));

  const orderIds = [...new Set(itemRows.map((i) => i.orderId))];
  const orderRows = orderIds.length
    ? await db.select().from(orders).where(inArray(orders.id, orderIds)).orderBy(desc(orders.createdAt))
    : [];
  const customerIds = [...new Set(orderRows.map((o) => o.customerId))];
  const customers = customerIds.length
    ? await db.select().from(users).where(inArray(users.id, customerIds))
    : [];
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const fbRows = orderIds.length
    ? await db.select().from(feedback).where(inArray(feedback.orderId, orderIds))
    : [];
  const fbByOrder = new Map(fbRows.map((f) => [f.orderId, f]));

  const orderShapes = orderRows.slice(0, 25).map((o) => {
    const myItems = itemRows.filter((i) => i.orderId === o.id);
    const customer = customerById.get(o.customerId);
    const fb = fbByOrder.get(o.id);
    return {
      id: o.id,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      customerName: customer ? firstName(customer.name) : "Customer",
      items: myItems.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        priceCents: i.priceCents,
      })),
      lineTotalCents: myItems.reduce((s, i) => s + i.priceCents * i.quantity, 0),
      productRating: fb?.productRating ?? null,
    };
  });

  const deliveredOrderIds = new Set(
    orderRows.filter((o) => o.status === "delivered").map((o) => o.id)
  );
  const revenueCents = itemRows
    .filter((i) => deliveredOrderIds.has(i.orderId))
    .reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const ratings = fbRows.map((f) => f.productRating).filter((r): r is number => !!r);

  return {
    farm: {
      id: farm.id,
      name: farm.name,
      description: farm.description,
      address: farm.address,
      city: farm.city,
    },
    products: prods.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      priceCents: p.priceCents,
      quantity: p.quantity,
      unit: p.unit,
      harvestedAt: p.harvestedAt ? p.harvestedAt.toISOString() : null,
    })),
    orders: orderShapes,
    stats: {
      revenueCents,
      orderCount: orderIds.length,
      activeProducts: prods.filter((p) => p.quantity > 0).length,
      avgRating: ratings.length
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null,
    },
  };
}

/* ------------------------------- notifications ------------------------------ */

export async function listNotifications(userId: string) {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(40);
  return {
    unread: rows.filter((r) => !r.read).length,
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      type: r.type,
      read: r.read,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
