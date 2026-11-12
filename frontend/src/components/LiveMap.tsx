"use client";

import {
  etaMinutes,
  hashStr,
  haversineKm,
  mulberry32,
  routePoint,
  type LatLng,
} from "@/lib/geo";
import { Clock, Home, Navigation, Sprout, Truck } from "lucide-react";
import { useMemo } from "react";

const W = 100;
const H = 62;

type Pt = LatLng & { label: string };

export function LiveMap({
  pickup,
  dropoff,
  driverPos,
  theme = "dark",
  showRoute = true,
}: {
  pickup: Pt | null;
  dropoff: Pt;
  driverPos?: LatLng | null;
  theme?: "light" | "dark";
  showRoute?: boolean;
}) {
  const dark = theme === "dark";

  const { project, roads, decor, routePath, km } = useMemo(() => {
    const pts: LatLng[] = [dropoff, ...(pickup ? [pickup] : [])];
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);
    // pad so markers sit comfortably inside, and keep a minimum span
    const padLat = Math.max((maxLat - minLat) * 0.45, 0.035);
    const padLng = Math.max((maxLng - minLng) * 0.45, 0.05);
    minLat -= padLat; maxLat += padLat; minLng -= padLng; maxLng += padLng;

    const project = (p: LatLng) => ({
      x: ((p.lng - minLng) / (maxLng - minLng)) * W,
      y: (1 - (p.lat - minLat) / (maxLat - minLat)) * H,
    });

    const seed = hashStr(
      `${pts.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|")}`
    );
    const rand = mulberry32(seed);

    // wavy street network
    const roads: { d: string; major: boolean }[] = [];
    const vLines = 6;
    for (let i = 0; i <= vLines; i++) {
      const baseX = (i / vLines) * W + (rand() - 0.5) * 8;
      let d = `M ${baseX.toFixed(2)} -4`;
      for (let s = 1; s <= 8; s++) {
        const y = (s / 8) * (H + 8) - 4;
        d += ` L ${(baseX + (rand() - 0.5) * 7).toFixed(2)} ${y.toFixed(2)}`;
      }
      roads.push({ d, major: i % 2 === 0 });
    }
    const hLines = 5;
    for (let i = 0; i <= hLines; i++) {
      const baseY = (i / hLines) * H + (rand() - 0.5) * 7;
      let d = `M -4 ${baseY.toFixed(2)}`;
      for (let s = 1; s <= 10; s++) {
        const x = (s / 10) * (W + 8) - 4;
        d += ` L ${x.toFixed(2)} ${(baseY + (rand() - 0.5) * 6).toFixed(2)}`;
      }
      roads.push({ d, major: i % 2 === 1 });
    }

    // water + park decoration
    const decor: { water: string; parks: { cx: number; cy: number; rx: number; ry: number }[] } = {
      water: `M ${W + 4} ${-4} L ${W + 4} ${18 + rand() * 12} C ${70 + rand() * 10} ${26 + rand() * 10}, ${82 - rand() * 8} ${2 + rand() * 6}, ${48 + rand() * 10} ${-4} Z`,
      parks: Array.from({ length: 3 }, () => ({
        cx: rand() * W,
        cy: rand() * H,
        rx: 4 + rand() * 7,
        ry: 2.5 + rand() * 4,
      })),
    };

    // route polyline through the shared deterministic curve
    let routePath = "";
    let km = 0;
    if (pickup) {
      km = haversineKm(pickup, dropoff);
      const pts2: string[] = [];
      for (let i = 0; i <= 30; i++) {
        const p = project(routePoint(i / 30, pickup, dropoff));
        pts2.push(`${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
      }
      routePath = `M ${pts2.join(" L ")}`;
    }

    return { project, roads, decor, routePath, km };
  }, [pickup, dropoff]);

  const pickupXY = pickup ? project(pickup) : null;
  const dropXY = project(dropoff);
  const driverXY = driverPos ? project(driverPos) : null;

  const c = dark
    ? {
        bg: "#0a1e13",
        roadMinor: "#15301f",
        roadMajor: "#1d402a",
        water: "#0f2a1b",
        park: "#14301f",
        grid: "rgba(246,240,225,0.05)",
      }
    : {
        bg: "#e6ddc7",
        roadMinor: "#f2ebd8",
        roadMajor: "#fbf7ea",
        water: "#c9d6bc",
        park: "#d7e0c2",
        grid: "rgba(23,33,26,0.05)",
      };

  return (
    <div
      className="relative w-full overflow-hidden rounded-[26px] border border-ink/10"
      style={{ aspectRatio: `${W}/${H}`, background: c.bg }}
    >
      {/* dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${c.grid} 1.2px, transparent 1.2px)`,
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path d={decor.water} fill={c.water} opacity={0.9} />
        {decor.parks.map((p, i) => (
          <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={c.park} opacity={0.85} />
        ))}
        {roads.filter((r) => !r.major).map((r, i) => (
          <path key={`m${i}`} d={r.d} fill="none" stroke={c.roadMinor} strokeWidth={dark ? 0.55 : 0.7} />
        ))}
        {roads.filter((r) => r.major).map((r, i) => (
          <path key={`M${i}`} d={r.d} fill="none" stroke={c.roadMajor} strokeWidth={dark ? 1.05 : 1.35} />
        ))}
        {showRoute && routePath && (
          <>
            <path d={routePath} fill="none" stroke="rgba(232,134,28,0.28)" strokeWidth={2.6} strokeLinecap="round" />
            <path className="route-dash" d={routePath} fill="none" stroke="#e8861c" strokeWidth={1.1} />
          </>
        )}
      </svg>

      {/* pickup marker */}
      {pickupXY && pickup && (
        <div
          className="map-marker absolute z-10 -translate-x-1/2 -translate-y-full"
          style={{ left: `${(pickupXY.x / W) * 100}%`, top: `${(pickupXY.y / H) * 100}%` }}
        >
          <div className="mb-1.5 flex items-center gap-1.5 rounded-full bg-cream py-1 pr-3 pl-1.5 shadow-lg ring-1 ring-ink/10">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-leaf/25">
              <Sprout className="h-3.5 w-3.5 text-moss" />
            </span>
            <span className="max-w-28 truncate text-[11px] font-bold text-forest-900">{pickup.label}</span>
          </div>
          <div className="mx-auto h-2 w-2 rotate-45 bg-cream ring-1 ring-ink/10" />
        </div>
      )}

      {/* drop-off marker */}
      <div
        className="map-marker absolute z-10 -translate-x-1/2 -translate-y-full"
        style={{ left: `${(dropXY.x / W) * 100}%`, top: `${(dropXY.y / H) * 100}%` }}
      >
        <div className="mb-1.5 flex items-center gap-1.5 rounded-full bg-forest-900 py-1 pr-3 pl-1.5 shadow-lg ring-1 ring-forest-950">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-cream/15">
            <Home className="h-3.5 w-3.5 text-cream" />
          </span>
          <span className="max-w-28 truncate text-[11px] font-bold text-cream">{dropoff.label}</span>
        </div>
        <div className="mx-auto h-2 w-2 rotate-45 bg-forest-900" />
      </div>

      {/* driver marker */}
      {driverXY && (
        <div
          className="map-marker absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(driverXY.x / W) * 100}%`, top: `${(driverXY.y / H) * 100}%` }}
        >
          <div className="pulse-dot relative grid h-9 w-9 place-items-center rounded-full bg-harvest text-forest-950 shadow-[0_8px_20px_-4px_rgba(232,134,28,0.9)] ring-2 ring-cream">
            <Truck className="relative h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
        </div>
      )}

      {/* compass */}
      <div className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-forest-950/55 text-cream/90 backdrop-blur-sm">
        <Navigation className="h-4 w-4 rotate-45" />
      </div>

      {/* info chip */}
      {km > 0 && (
        <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-full bg-forest-950/70 py-1.5 pr-4 pl-2 text-cream backdrop-blur-sm">
          <span className="flex items-center gap-1.5 text-xs font-bold">
            <span className={driverXY ? "relative grid h-2 w-2 place-items-center rounded-full bg-harvest text-harvest" : "h-2 w-2 rounded-full bg-sage"}>
              {driverXY && <span className="pulse-dot absolute inset-0 rounded-full" />}
            </span>
            {km.toFixed(1)} km
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-cream/75">
            <Clock className="h-3 w-3" /> ~{etaMinutes(km)} min
          </span>
        </div>
      )}
    </div>
  );
}
