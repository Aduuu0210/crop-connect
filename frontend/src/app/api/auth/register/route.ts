import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";

const ROLES = new Set(["customer", "driver", "farmer"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const phone = String(body.phone ?? "").trim() || null;
    const role = String(body.role ?? "");

    if (name.length < 2) return Response.json({ error: "Please enter your full name." }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    if (password.length < 6)
      return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    if (!ROLES.has(role))
      return Response.json({ error: "Please choose an account type." }, { status: 400 });

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length)
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: hashPassword(password), phone, role })
      .returning();
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
    console.error("register", e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
