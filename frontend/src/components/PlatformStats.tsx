"use client";

import { useEffect, useState } from "react";
import { getPlatformStats, type PlatformStats as Stats } from "@/lib/api";

export function PlatformStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    getPlatformStats().then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
  }, []);

  if (!stats) return null;

  const items = [
    { label: "Local farms", value: stats.farms },
    { label: "Products listed", value: stats.products },
    { label: "Orders placed", value: stats.orders },
    { label: "Delivered", value: stats.delivered },
  ];

  return (
    <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 px-4 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-2xl border border-emerald-100 bg-white/80 p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-emerald-800">{i.value}</div>
          <div className="text-xs font-medium text-stone-500">{i.label}</div>
        </div>
      ))}
    </div>
  );
}
