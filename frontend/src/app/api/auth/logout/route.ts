import { destroySession } from "@/lib/auth";

export async function POST(req: Request) {
  let token: string | null = null;
  try {
    const body = await req.json();
    token = body.token;
  } catch {}
  await destroySession(token);
  return Response.json({ ok: true });
}
