import { getSessionUser } from "@/lib/auth";
import { listCustomerOrders } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Single order view for the owning customer (driver details stay hidden
 *  until a driver accepts — enforced inside listCustomerOrders). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  if (user.role !== "customer")
    return Response.json({ error: "Forbidden." }, { status: 403 });
  const mine = await listCustomerOrders(user.id);
  const order = mine.find((o) => o.id === id);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  return Response.json({ order });
}
