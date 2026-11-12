import { db } from "@/db";
import { addresses } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geo";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const [existing] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  if (!existing) return Response.json({ error: "Address not found." }, { status: 404 });

  const body = await req.json();
  const label = String(body.label ?? existing.label).trim();
  const line1 = String(body.line1 ?? existing.line1).trim();
  const city = String(body.city ?? existing.city).trim();
  const state = String(body.state ?? existing.state).trim();
  const zip = String(body.zip ?? existing.zip).trim();
  const isDefault = !!body.isDefault;
  const { lat, lng } = geocodeAddress(`${line1}, ${city}, ${state} ${zip}:${user.id}`);

  const [row] = await db.transaction(async (tx) => {
    if (isDefault) {
      await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
    }
    return tx
      .update(addresses)
      .set({ label, line1, city, state, zip, lat, lng, isDefault: isDefault || existing.isDefault })
      .where(eq(addresses.id, id))
      .returning();
  });
  return Response.json({ ok: true, address: row });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  try {
    await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "This address is attached to an order and can't be removed." },
      { status: 409 }
    );
  }
}
