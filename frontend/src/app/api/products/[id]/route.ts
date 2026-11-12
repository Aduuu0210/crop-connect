import { db } from "@/db";
import { farms, products } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

async function ownProduct(userId: string, productId: string) {
  const rows = await db
    .select({ p: products })
    .from(products)
    .innerJoin(farms, eq(products.farmId, farms.id))
    .where(and(eq(products.id, productId), eq(farms.ownerId, userId)))
    .limit(1);
  return rows[0]?.p ?? null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer")
    return Response.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const existing = await ownProduct(user.id, id);
  if (!existing) return Response.json({ error: "Product not found." }, { status: 404 });

  const body = await req.json();
  const updates: Partial<typeof products.$inferInsert> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) return Response.json({ error: "Name too short." }, { status: 400 });
    updates.name = name;
  }
  if (body.description !== undefined) updates.description = String(body.description).trim();
  if (body.imageUrl !== undefined) {
    const imageUrl = String(body.imageUrl);
    if (imageUrl.length > 3_500_000)
      return Response.json({ error: "Image is too large." }, { status: 400 });
    updates.imageUrl = imageUrl;
  }
  if (body.priceCents !== undefined) {
    const priceCents = Math.round(Number(body.priceCents));
    if (!Number.isFinite(priceCents) || priceCents < 1)
      return Response.json({ error: "Enter a valid price." }, { status: 400 });
    updates.priceCents = priceCents;
  }
  if (body.quantity !== undefined) {
    const quantity = Math.round(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity < 0)
      return Response.json({ error: "Enter a valid quantity." }, { status: 400 });
    updates.quantity = quantity;
  }
  if (body.unit !== undefined) updates.unit = String(body.unit).trim() || "each";
  if (body.harvestedAt !== undefined) {
    const d = new Date(body.harvestedAt);
    updates.harvestedAt = isNaN(d.getTime()) ? existing.harvestedAt : d;
  }

  const [row] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
  return Response.json({ ok: true, product: row });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer")
    return Response.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const existing = await ownProduct(user.id, id);
  if (!existing) return Response.json({ error: "Product not found." }, { status: 404 });
  await db.delete(products).where(eq(products.id, id));
  return Response.json({ ok: true });
}
