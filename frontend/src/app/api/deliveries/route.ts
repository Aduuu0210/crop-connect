import { getSessionUser } from "@/lib/auth";
import { getDriverActive, getDriverBoard, getDriverStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "driver")
    return Response.json({ error: "Forbidden." }, { status: 403 });
  const url = new URL(req.url);
  if (url.searchParams.get("active")) {
    return Response.json({ active: await getDriverActive(user.id) });
  }
  const [jobs, stats] = await Promise.all([getDriverBoard(user.id), getDriverStats(user.id)]);
  return Response.json({ jobs, stats });
}
