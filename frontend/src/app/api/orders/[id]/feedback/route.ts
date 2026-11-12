import { db } from "@/db";
import { feedback, orders, reports } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

/** Post-delivery actions: rate products + driver (1–5) and/or file a report. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "customer")
    return Response.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.customerId, user.id)));
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "delivered")
    return Response.json({ error: "You can review an order after it's delivered." }, { status: 409 });

  const body = await req.json();
  const productRating = Number(body.productRating) || null;
  const driverRating = Number(body.driverRating) || null;
  const comment = String(body.comment ?? "").trim();
  const report = String(body.report ?? "").trim();

  for (const r of [productRating, driverRating]) {
    if (r !== null && (r < 1 || r > 5))
      return Response.json({ error: "Ratings must be between 1 and 5." }, { status: 400 });
  }
  if (!productRating && !driverRating && !report && !comment)
    return Response.json({ error: "Nothing to submit." }, { status: 400 });

  if (productRating || driverRating || comment) {
    await db
      .insert(feedback)
      .values({ orderId: id, productRating, driverRating, comment })
      .onConflictDoUpdate({
        target: feedback.orderId,
        set: { productRating, driverRating, comment },
      });
  }
  if (report) {
    await db.insert(reports).values({ orderId: id, userId: user.id, message: report });
  }
  return Response.json({ ok: true });
}
