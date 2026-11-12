"use client";

export const SESSION_STORAGE_KEY = "fd_session_token";
export const USER_STORAGE_KEY = "fd_user";

export function getClientToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const urlToken = new URLSearchParams(window.location.search).get("token");
    if (urlToken) {
      localStorage.setItem(SESSION_STORAGE_KEY, urlToken);
      return urlToken;
    }
    const local = localStorage.getItem(SESSION_STORAGE_KEY);
    if (local) return local;
    const match = document.cookie.match(new RegExp("(^|;\\s*)fd_session=([^;]*)"));
    if (match?.[2]) return decodeURIComponent(match[2]);
  } catch {}
  return null;
}

export function saveClientSession(token: string, user?: { id: string; name: string; email: string; role: string }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, token);
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
    document.cookie = `fd_session=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=None; Secure`;
  } catch {}
}

export function clearClientSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    document.cookie = `fd_session=; path=/; max-age=0; SameSite=None; Secure`;
  } catch {}
}

/**
 * Fetch wrapper that attaches the session token via multiple channels:
 * 1. Authorization header: Bearer <token>
 * 2. x-session-token header
 * 3. Cookie (if supported by browser)
 * 4. Query param fallback (?token=...)
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getClientToken();
  const options: RequestInit = { ...(init || {}) };
  const headers = new Headers(options.headers || {});

  if (token) {
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("x-session-token")) {
      headers.set("x-session-token", token);
    }
  }

  options.headers = headers;
  options.credentials = "include"; // ensures cookies are sent whenever allowed

  // Also append token to URL if it's a relative API request
  let url = input;
  if (token && typeof input === "string" && input.startsWith("/api/")) {
    const separator = input.includes("?") ? "&" : "?";
    url = `${input}${separator}token=${encodeURIComponent(token)}`;
  }

  return fetch(url, options);
}
