import { db } from "./index";
import {
  addresses,
  deliveries,
  farms,
  feedback,
  notifications,
  orderItems,
  orders,
  products,
  reports,
  sessions,
  users,
} from "./schema";
import { hashPassword } from "../lib/password";
import { haversineKm } from "../lib/geo";

const h = (hours: number) => new Date(Date.now() - hours * 3600_000);

/** Idempotent demo seed: clears all tables and recreates the demo dataset. */
export async function seedDatabase() {
  await db.delete(notifications);
  await db.delete(reports);
  await db.delete(feedback);
  await db.delete(deliveries);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(addresses);
  await db.delete(products);
  await db.delete(farms);
  await db.delete(sessions);
  await db.delete(users);

  const pw = hashPassword("password123");

  const [maya, darius, elena, sam, june, tom] = await db
    .insert(users)
    .values([
      { email: "customer@farmdirect.com", name: "Maya Chen", role: "customer", phone: "(503) 555-0110", passwordHash: pw },
      { email: "driver@farmdirect.com", name: "Darius Cole", role: "driver", phone: "(503) 555-0121", passwordHash: pw },
      { email: "farmer@farmdirect.com", name: "Elena Marsh", role: "farmer", phone: "(503) 555-0135", passwordHash: pw },
      { email: "sam@farmdirect.com", name: "Sam Whitaker", role: "farmer", phone: "(503) 555-0144", passwordHash: pw },
      { email: "june@farmdirect.com", name: "June Park", role: "farmer", phone: "(503) 555-0157", passwordHash: pw },
      { email: "tom@farmdirect.com", name: "Tom Alvarez", role: "customer", phone: "(503) 555-0163", passwordHash: pw },
    ])
    .returning();

  const [greenValley, sunrise, willow] = await db
    .insert(farms)
    .values([
      {
        ownerId: elena.id,
        name: "Green Valley Organics",
        description:
          "Third-generation family farm in the Willamette Valley. Heirloom vegetables grown slowly, without sprays, harvested to order.",
        address: "18400 S Redland Rd",
        city: "Oregon City, OR",
        lat: 45.361,
        lng: -122.611,
      },
      {
        ownerId: sam.id,
        name: "Sunrise Orchard",
        description:
          "A 40-acre orchard in India. Apples, berries, and raw honey from our own hives, all picked at first light.",
        address: "21775 SW Farmington Rd",
        city: "Beaverton, OR",
        lat: 45.4875,
        lng: -122.89,
      },
      {
        ownerId: june.id,
        name: "Willow Creek Dairy",
        description:
          "Pasture-raised hens and a small herd of Jersey cows. Eggs collected twice daily, milk bottled the morning it ships.",
        address: "12608 NE 72nd Ave",
        city: "Vancouver, WA",
        lat: 45.637,
        lng: -122.661,
      },
    ])
    .returning();

  const [tomatoes, carrots, kale, corn, apples, honey, berries, eggs, milk] = await db
    .insert(products)
    .values([
      { farmId: greenValley.id, name: "Heirloom Tomatoes", description: "Vine-ripened cherokee purples and brandywines, still warm from the field.", imageUrl: "/img/p-tomatoes.svg", priceCents: 1080, quantity: 42, unit: "kg", harvestedAt: h(9) },
      { farmId: greenValley.id, name: "Rainbow Carrot Bunch", description: "Sweet Nantes and cosmic purples, pulled yesterday with tops on.", imageUrl: "/img/p-carrots.svg", priceCents: 320, quantity: 35, unit: "bunch", harvestedAt: h(20) },
      { farmId: greenValley.id, name: "Lacinato Kale", description: "Tender dinosaur kale, cut before sunrise and bunched with twine.", imageUrl: "/img/p-kale.svg", priceCents: 280, quantity: 28, unit: "bunch", harvestedAt: h(7) },
      { farmId: greenValley.id, name: "Sweet Corn · 4 ears", description: "Bodacious yellow corn, so fresh it barely needs cooking.", imageUrl: "/img/p-corn.svg", priceCents: 500, quantity: 30, unit: "pack", harvestedAt: h(30) },
      { farmId: sunrise.id, name: "Honeycrisp Apples", description: "Explosively crisp, honey-sweet with the perfect acid snap.", imageUrl: "/img/p-apples.svg", priceCents: 795, quantity: 55, unit: "kg", harvestedAt: h(26) },
      { farmId: sunrise.id, name: "Raw Wildflower Honey · 340g", description: "Unfiltered honey from the orchard hives. Never heated, never rushed.", imageUrl: "/img/p-honey.svg", priceCents: 1150, quantity: 18, unit: "jar", harvestedAt: h(70) },
      { farmId: sunrise.id, name: "Garden Strawberries · 500ml", description: "Hood strawberries — the fragile, fragrant kind supermarkets can't ship.", imageUrl: "/img/p-berries.svg", priceCents: 640, quantity: 24, unit: "500ml", harvestedAt: h(8) },
      { farmId: willow.id, name: "Pasture-Raised Eggs · dozen", description: "Deep-orange yolks from hens that actually roam. Collected twice a day.", imageUrl: "/img/p-eggs.svg", priceCents: 720, quantity: 26, unit: "dozen", harvestedAt: h(12) },
      { farmId: willow.id, name: "A2 Whole Milk · 2L", description: "Cream-top Jersey milk, bottled the morning it's delivered.", imageUrl: "/img/p-milk.svg", priceCents: 580, quantity: 22, unit: "2L", harvestedAt: h(10) },
    ])
    .returning();

  const [mayaHome, mayaWork, tomHome] = await db
    .insert(addresses)
    .values([
      { userId: maya.id, label: "Rosewood Loft", line1: "1214 NW Flanders St", city: "Mumbai", state: "MH", zip: "400001", lat: 18.922, lng: 72.834, isDefault: true },
      { userId: maya.id, label: "The Studio", line1: "1022 SE Stark St", city: "Mumbai", state: "MH", zip: "400002", lat: 18.932, lng: 72.825, isDefault: false },
      { userId: tom.id, label: "Irvington Craftsman", line1: "2210 NE Hancock St", city: "Mumbai", state: "MH", zip: "400003", lat: 18.941, lng: 72.822, isDefault: true },
    ])
    .returning();

  // Order A: delivered two days ago (Maya can rate it)
  const kmA = haversineKm(willow, mayaHome) * 1.35;
  const payoutA = Math.round(375 + kmA * 118);
  const [orderA] = await db
    .insert(orders)
    .values({
      customerId: maya.id,
      addressId: mayaHome.id,
      status: "delivered",
      subtotalCents: 720 + 2 * 795,
      deliveryFeeCents: 499,
      totalCents: 720 + 2 * 795 + 499,
      createdAt: h(50),
    })
    .returning();
  await db.insert(orderItems).values([
    { orderId: orderA.id, productId: eggs.id, farmId: willow.id, name: eggs.name, unit: eggs.unit, quantity: 1, priceCents: eggs.priceCents, imageUrl: eggs.imageUrl },
    { orderId: orderA.id, productId: apples.id, farmId: sunrise.id, name: apples.name, unit: apples.unit, quantity: 2, priceCents: apples.priceCents, imageUrl: apples.imageUrl },
  ]);
  await db.insert(deliveries).values({
    orderId: orderA.id,
    driverId: darius.id,
    status: "delivered",
    driverLat: mayaHome.lat,
    driverLng: mayaHome.lng,
    progress: 1,
    payoutCents: payoutA,
    distanceKm: kmA,
    acceptedAt: h(49),
    pickedUpAt: h(48.5),
    deliveredAt: h(47),
    createdAt: h(50),
  });
  await db.insert(notifications).values([
    { userId: maya.id, title: "Order delivered", body: "Your order was delivered. Enjoy — and don't forget to rate your experience.", type: "delivery", read: true, createdAt: h(47) },
    { userId: willow.ownerId, title: "Order delivered", body: "One of your orders was successfully delivered to the customer.", type: "order", read: true, createdAt: h(47) },
    { userId: sunrise.ownerId, title: "Order delivered", body: "One of your orders was successfully delivered to the customer.", type: "order", read: true, createdAt: h(47) },
  ]);

  // Order B: placed 35 minutes ago, waiting for a driver (Tom's)
  const kmB = haversineKm(greenValley, tomHome) * 1.35;
  const payoutB = Math.round(375 + kmB * 118);
  const [orderB] = await db
    .insert(orders)
    .values({
      customerId: tom.id,
      addressId: tomHome.id,
      status: "placed",
      subtotalCents: 2 * 320 + 280 + 580,
      deliveryFeeCents: 499,
      totalCents: 2 * 320 + 280 + 580 + 499,
      createdAt: h(0.6),
    })
    .returning();
  await db.insert(orderItems).values([
    { orderId: orderB.id, productId: carrots.id, farmId: greenValley.id, name: carrots.name, unit: carrots.unit, quantity: 2, priceCents: carrots.priceCents, imageUrl: carrots.imageUrl },
    { orderId: orderB.id, productId: kale.id, farmId: greenValley.id, name: kale.name, unit: kale.unit, quantity: 1, priceCents: kale.priceCents, imageUrl: kale.imageUrl },
    { orderId: orderB.id, productId: milk.id, farmId: willow.id, name: milk.name, unit: milk.unit, quantity: 1, priceCents: milk.priceCents, imageUrl: milk.imageUrl },
  ]);
  await db.insert(deliveries).values({
    orderId: orderB.id,
    status: "pending",
    payoutCents: payoutB,
    distanceKm: kmB,
    createdAt: h(0.6),
  });
  await db.insert(notifications).values([
    { userId: greenValley.ownerId, title: "New order received", body: "Tom ordered 2× Rainbow Carrot Bunch, 1× Lacinato Kale. Have it packed and ready for pickup.", type: "order", read: false, createdAt: h(0.58) },
    { userId: willow.ownerId, title: "New order received", body: "Tom ordered 1× A2 Whole Milk · 2L. Have it packed and ready for pickup.", type: "order", read: false, createdAt: h(0.58) },
  ]);
}
