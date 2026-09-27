import type { PoolStatus, RideStatus } from "@dtp/shared";

// Valid transitions for each state machine. Anything not listed is rejected.
// See docs/lifecycle.md.
const RIDE_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  REQUESTED: ["MATCHED", "CANCELLED"],
  MATCHED: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["STARTED", "CANCELLED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const POOL_TRANSITIONS: Record<PoolStatus, PoolStatus[]> = {
  FORMING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionRide(from: RideStatus, to: RideStatus): boolean {
  return RIDE_TRANSITIONS[from].includes(to);
}

export function canTransitionPool(from: PoolStatus, to: PoolStatus): boolean {
  return POOL_TRANSITIONS[from].includes(to);
}
