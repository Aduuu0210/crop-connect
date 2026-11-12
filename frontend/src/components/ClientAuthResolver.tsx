"use client";

import { getClientToken, clearClientSession, authFetch } from "@/lib/clientAuth";
import { homeForRole } from "@/lib/utils";
import { Loader2, Sprout } from "lucide-react";
import { useEffect, useState } from "react";

export function ClientAuthResolver({
  expectedRole,
}: {
  expectedRole: "customer" | "driver" | "farmer";
}) {
  const [status, setStatus] = useState<"checking" | "failed">("checking");

  useEffect(() => {
    let active = true;
    const token = getClientToken();

    if (!token) {
      window.location.replace("/login");
      return;
    }

    // Verify token with backend
    authFetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.user) {
          if (data.user.role === expectedRole) {
            // Reload with token in search param so server component renders
            const url = new URL(window.location.href);
            url.searchParams.set("token", token);
            window.location.replace(url.toString());
          } else {
            window.location.replace(homeForRole(data.user.role));
          }
        } else {
          clearClientSession();
          window.location.replace("/login");
        }
      })
      .catch(() => {
        if (!active) return;
        setStatus("failed");
      });

    return () => {
      active = false;
    };
  }, [expectedRole]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Crop Connect Logo" className="h-16 w-auto object-contain" />
      </div>
      <div className="mt-6 flex items-center gap-2.5 text-sm font-semibold text-ink/70">
        <Loader2 className="h-4 w-4 animate-spin text-harvest-600" />
        <span>Loading your Crop Connect workspace…</span>
      </div>
      {status === "failed" && (
        <button
          onClick={() => {
            clearClientSession();
            window.location.replace("/login");
          }}
          className="mt-6 rounded-full border border-ink/20 px-5 py-2 text-xs font-bold text-ink/70 hover:border-ink hover:text-ink"
        >
          Return to sign in
        </button>
      )}
    </div>
  );
}
