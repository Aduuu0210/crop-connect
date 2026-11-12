import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { ensureReady } from "./bootstrap";
import { newToken } from "./password";
import { homeForRole } from "./utils";

const SESSION_DAYS = 30;
export const SESSION_COOKIE = "fd_session";

export async function createSession(userId: string): Promise<string> {
  await ensureReady();
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  try {
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      expires: expiresAt,
    });
  } catch {}
  return token;
}

export async function getSessionUser(reqOrToken?: Request | string | null): Promise<User | null> {
  await ensureReady();
  let token: string | null = null;

  if (typeof reqOrToken === "string" && reqOrToken.trim()) {
    token = reqOrToken.trim();
  } else if (reqOrToken && typeof reqOrToken === "object" && "headers" in reqOrToken) {
    const auth = reqOrToken.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) token = auth.slice(7).trim();
    if (!token) token = reqOrToken.headers.get("x-session-token");
    if (!token) {
      try {
        const url = new URL(reqOrToken.url);
        token = url.searchParams.get("token");
      } catch {}
    }
  }

  if (!token) {
    try {
      const store = await cookies();
      token = store.get(SESSION_COOKIE)?.value ?? null;
    } catch {}
  }

  if (!token) {
    try {
      const hdrs = await headers();
      const auth = hdrs.get("authorization");
      if (auth?.startsWith("Bearer ")) token = auth.slice(7).trim();
      if (!token) token = hdrs.get("x-session-token");
      if (!token) {
        const ref = hdrs.get("referer");
        if (ref) {
          try {
            const u = new URL(ref);
            token = u.searchParams.get("token");
          } catch {}
        }
      }
    } catch {}
  }

  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0]?.user ?? null;
}

export async function destroySession(explicitToken?: string | null) {
  let token = explicitToken;
  try {
    const store = await cookies();
    if (!token) token = store.get(SESSION_COOKIE)?.value;
    store.delete(SESSION_COOKIE);
  } catch {}

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
}

/** Check if current request matches the role. Returns user if authenticated, null otherwise. */
export async function tryRequireRole(role: "customer" | "driver" | "farmer", explicitToken?: string | null) {
  const user = await getSessionUser(explicitToken);
  if (!user || user.role !== role) return null;
  return user;
}

/** Page guard: redirects to /login unless signed in with the given role. */
export async function requireRole(role: "customer" | "driver" | "farmer", explicitToken?: string | null) {
  const user = await getSessionUser(explicitToken);
  if (!user) redirect("/login");
  if (user.role !== role) redirect(homeForRole(user.role));
  return user;
}
