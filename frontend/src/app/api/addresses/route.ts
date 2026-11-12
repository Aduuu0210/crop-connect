import { db } from "@/db";
import { addresses } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geo";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const rows = await db.select().from(addresses).where(eq(addresses.userId, user.id));
  return Response.json({ addresses: rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const label = String(body.label ?? "").trim();
  const line1 = String(body.line1 ?? "").trim();
  const city = String(body.city ?? "").trim();
  const state = String(body.state ?? "").trim();
  const zip = String(body.zip ?? "").trim();
  const wantDefault = !!body.isDefault;

  if (label.length < 2) return Response.json({ error: "Give this address a label (e.g. Home)." }, { status: 400 });
  if (line1.length < 5) return Response.json({ error: "Enter a street address." }, { status: 400 });
  if (city.length < 2) return Response.json({ error: "Enter a city." }, { status: 400 });

  const existing = await db.select().from(addresses).where(eq(addresses.userId, user.id));
  const isDefault = wantDefault || existing.length === 0;
  const { lat, lng } = geocodeAddress(`${line1}, ${city}, ${state} ${zip}:${user.id}`);

  const [row] = await db.transaction(async (tx) => {
    if (isDefault) {
      await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
    }
    return tx
      .insert(addresses)
      .values({ userId: user.id, label, line1, city, state, zip, lat, lng, isDefault })
      .returning();
  });
  return Response.json({ ok: true, address: row });
}
