/**
 * Fetch helpers for the Render-hosted backend (backend/server.js).
 * Render's free tier sleeps after ~15 min idle, so the first call can take
 * 30-60 s. We use a timeout + one retry and fail soft (callers show a fallback).
 */
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type PlatformStats = {
  farms: number;
  products: number;
  orders: number;
  delivered: number;
};

async function request<T>(path: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function getPlatformStats(): Promise<PlatformStats | null> {
  if (!BASE) return null;
  try {
    return await request<PlatformStats>("/api/stats", 45_000);
  } catch {
    try {
      return await request<PlatformStats>("/api/stats", 45_000);
    } catch {
      return null;
    }
  }
}
