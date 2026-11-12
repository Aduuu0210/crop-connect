import { db } from "@/db";
import { farms, products } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { listMarketProducts } from "@/lib/queries";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("mine")) {
    const user = await getSessionUser();
    if (!user || user.role !== "farmer")
      return Response.json({ error: "Forbidden." }, { status: 403 });
    const [farm] = await db.select().from(farms).where(eq(farms.ownerId, user.id));
    if (!farm) return Response.json({ products: [] });
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.farmId, farm.id))
      .orderBy(desc(products.createdAt));
    return Response.json({ products: rows });
  }
  return Response.json({ products: await listMarketProducts() });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer")
    return Response.json({ error: "Only farmers can add products." }, { status: 403 });

  const [farm] = await db.select().from(farms).where(eq(farms.ownerId, user.id));
  if (!farm)
    return Response.json(
      { error: "Create your farm profile before adding products." },
      { status: 400 }
    );

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const imageUrl = String(body.imageUrl ?? "");
  const priceCents = Math.round(Number(body.priceCents));
  const quantity = Math.round(Number(body.quantity));
  const unit = String(body.unit ?? "each").trim() || "each";
  const harvestedAt = body.harvestedAt ? new Date(body.harvestedAt) : null;

  if (name.length < 2) return Response.json({ error: "Product name is required." }, { status: 400 });
  if (!Number.isFinite(priceCents) || priceCents < 1)
    return Response.json({ error: "Enter a valid price." }, { status: 400 });
  if (!Number.isFinite(quantity) || quantity < 0)
    return Response.json({ error: "Enter a valid quantity." }, { status: 400 });
  if (imageUrl && imageUrl.length > 3_500_000)
    return Response.json({ error: "Image is too large (max ~2.5 MB)." }, { status: 400 });

  const [row] = await db
    .insert(products)
    .values({
      farmId: farm.id,
      name,
      description,
      imageUrl,
      priceCents,
      quantity,
      unit,
      harvestedAt: harvestedAt && !isNaN(harvestedAt.getTime()) ? harvestedAt : new Date(),
    })
    .returning();
  return Response.json({ ok: true, product: row });
}
