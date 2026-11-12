/**
 * Geo helpers: haversine distance, deterministic pseudo-geocoding for the
 * demo service area (India metro), and route interpolation shared by
 * the live map and the driver-location simulator.
 */

export type LatLng = { lat: number; lng: number };

// Demo service area bounding box (India metro).
const AREA = { latMin: 45.43, latMax: 45.64, lngMin: -122.84, lngMax: -122.5 };

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG used for stable pseudo-random layouts. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic pseudo-geocode: hashes an address string to a stable point
 * inside the demo service area. Stands in for a geocoding API.
 */
export function geocodeAddress(seed: string): LatLng {
  const rand = mulberry32(hashStr(seed.toLowerCase().trim()));
  const lat = AREA.latMin + rand() * (AREA.latMax - AREA.latMin);
  const lng = AREA.lngMin + rand() * (AREA.lngMax - AREA.lngMin);
  return { lat: round6(lat), lng: round6(lng) };
}

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * A point (in geo coords) along the curved route between two points,
 * t in [0,1]. Deterministic so the driver simulator and every client's map
 * agree exactly on the path.
 */
export function routePoint(t: number, a: LatLng, b: LatLng): LatLng {
  const clamped = Math.max(0, Math.min(1, t));
  const ctrl = routeControl(a, b);
  const u = 1 - clamped;
  return {
    lat: u * u * a.lat + 2 * u * clamped * ctrl.lat + clamped * clamped * b.lat,
    lng: u * u * a.lng + 2 * u * clamped * ctrl.lng + clamped * clamped * b.lng,
  };
}

function routeControl(a: LatLng, b: LatLng): LatLng {
  const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  // Perpendicular bend; sign chosen deterministically from the endpoint pair.
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const len = Math.hypot(dx, dy) || 1e-9;
  const sign = hashStr(`${a.lat},${a.lng}->${b.lat},${b.lng}`) % 2 === 0 ? 1 : -1;
  const bend = len * 0.22 * sign;
  return { lat: mid.lat - (dx / len) * bend, lng: mid.lng + (dy / len) * bend };
}

/** Rough driving ETA in minutes at urban speeds. */
export function etaMinutes(km: number) {
  return Math.max(4, Math.round((km / 26) * 60));
}
