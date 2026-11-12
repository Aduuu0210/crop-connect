import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureReady } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Self-heal (reseed if the demo data was wiped), then verify the DB.
    await ensureReady();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
