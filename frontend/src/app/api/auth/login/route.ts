import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json({ error: "Incorrect email or password." }, { status: 401 });
    }
    const token = await createSession(user.id);
    return Response.json({
      ok: true,
      role: user.role,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (e) {
    console.error("login", e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
