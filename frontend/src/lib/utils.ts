import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(...inputs);
}

export function formatMoney(cents: number) {
  return `₹${Math.round(cents * 0.83).toLocaleString("en-IN")}`;
}

export function timeAgo(iso: string | Date | null | undefined) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function harvestLabel(iso: string | Date | null | undefined) {
  if (!iso) return "Fresh batch";
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 86400000
  );
  if (days <= 0) return "Harvested today";
  if (days === 1) return "Harvested yesterday";
  return `Harvested ${days} days ago`;
}

export function homeForRole(role: string) {
  if (role === "driver") return "/driver";
  if (role === "farmer") return "/farmer";
  return "/customer";
}

export function shortId(id: string) {
  return `#${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

export const ORDER_STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "driver_assigned", label: "Driver assigned" },
  { key: "in_transit", label: "On the way" },
  { key: "delivered", label: "Delivered" },
] as const;

export function orderStepIndex(status: string) {
  const i = ORDER_STEPS.findIndex((s) => s.key === status);
  return i < 0 ? 0 : i;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  placed: "Finding a driver",
  driver_assigned: "Driver assigned",
  in_transit: "On the way",
  delivered: "Delivered",
};
