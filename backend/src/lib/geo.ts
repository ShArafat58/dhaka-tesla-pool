import { AREAS } from "@dtp/shared";
import type { AreaCode } from "@dtp/shared";

const EARTH_RADIUS_M = 6_371_000;
const ROAD_FACTOR = 1.3;

type Point = { latitude: number; longitude: number };

const areaByCode = new Map<string, Point>(
  AREAS.map((a) => [a.code, { latitude: a.latitude, longitude: a.longitude }]),
);

function getPoint(code: AreaCode): Point {
  const point = areaByCode.get(code);
  if (!point) {
    throw new Error(`Unknown area code: ${code}`);
  }
  return point;
}

const toRadians = (deg: number) => (deg * Math.PI) / 180;
const toDegrees = (rad: number) => (rad * 180) / Math.PI;

// Great-circle distance in metres.
export function haversineMetres(from: Point, to: Point): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// Compass bearing (0-359) of `to` seen from `from`.
export function bearingDegrees(from: Point, to: Point): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.round((toDegrees(Math.atan2(y, x)) + 360) % 360);
}

// Estimated road distance, straight line scaled and rounded to the nearest 100 m.
export function roadDistanceMetres(pickup: AreaCode, dropoff: AreaCode): number {
  const straight = haversineMetres(getPoint(pickup), getPoint(dropoff));
  return Math.round((straight * ROAD_FACTOR) / 100) * 100;
}

export function tripBearing(pickup: AreaCode, dropoff: AreaCode): number {
  return bearingDegrees(getPoint(pickup), getPoint(dropoff));
}
