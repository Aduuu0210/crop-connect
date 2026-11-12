import { db } from "@/db";
import { farms } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geo";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer")
    return Response.json({ error: "Forbidden." }, { status: 403 });
  const [farm] = await db.select().from(farms).where(eq(farms.ownerId, user.id));
  return Response.json({ farm: farm ?? null });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "farmer")
    return Response.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim();
  const address = String(body.address ?? "").trim();
  const city = String(body.city ?? "").trim();

  if (name.length < 2) return Response.json({ error: "Farm name is required." }, { status: 400 });
  if (address.length < 5) return Response.json({ error: "Enter your farm's street address." }, { status: 400 });
  if (city.length < 2) return Response.json({ error: "Enter your city." }, { status: 400 });

  const { lat, lng } = geocodeAddress(`${address}, ${city}:${user.id}`);
  const [farm] = await db
    .insert(farms)
    .values({ ownerId: user.id, name, description, address, city, lat, lng })
    .onConflictDoUpdate({
      target: farms.ownerId,
      set: { name, description, address, city, lat, lng },
    })
    .returning();

  return Response.json({ ok: true, farm });
}
