import { AREAS } from "@dtp/shared";
import type { AreaCode } from "@dtp/shared";

const areaName = new Map<string, string>(AREAS.map((a) => [a.code, a.name]));

export function formatArea(code: string): string {
  return areaName.get(code) ?? code;
}

// Integer paisa -> taka for display, e.g. 6450 -> "৳64.50".
// Money is stored as integer paisa everywhere; we only format at display time.
export function formatTaka(paisa: number): string {
  return `৳${(paisa / 100).toFixed(2)}`;
}

export function formatKm(metres: number): string {
  return `${(metres / 1000).toFixed(1)} km`;
}

// "REQUESTED" -> "Requested", "DRIVER_ARRIVED" -> "Driver arrived"
export function humanizeStatus(status: string): string {
  const s = status.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type { AreaCode };
