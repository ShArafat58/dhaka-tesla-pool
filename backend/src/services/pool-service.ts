import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.ts";
import { pools, rideRequests, statusHistory } from "../db/schema.ts";
import { badRequest, forbidden, notFound } from "../lib/errors.ts";
import { isDirectionCompatible } from "../lib/matching.ts";

// Adds a REQUESTED ride to an existing ACCEPTED pool.
// Three layers of protection against two riders racing for the last seat:
//   1. SELECT ... FOR UPDATE locks the pool row, so the second caller waits.
//   2. An application check compares seatsTaken + seats against capacity.
//   3. The DB CHECK (seats_taken <= capacity) is the final backstop.
export async function joinPool(passengerId: string, poolId: string, rideId: string) {
  return db.transaction(async (tx) => {
    // Layer 1: lock the pool row for the duration of the transaction.
    const [pool] = await tx.select().from(pools).where(eq(pools.id, poolId)).for("update").limit(1);
    if (!pool) throw notFound("Pool not found");
    if (pool.status !== "ACCEPTED") {
      throw badRequest("This pool is not accepting passengers", "POOL_CLOSED");
    }

    const [ride] = await tx.select().from(rideRequests).where(eq(rideRequests.id, rideId)).limit(1);
    if (!ride) throw notFound("Ride not found");
    if (ride.passengerId !== passengerId) throw forbidden("You can only join with your own ride");
    if (ride.poolId || ride.status !== "REQUESTED") {
      throw badRequest("This ride is no longer available", "RIDE_UNAVAILABLE");
    }
    if (ride.pickupArea !== pool.pickupArea) {
      throw badRequest("Pickup area does not match the pool", "PICKUP_MISMATCH");
    }

    // Direction rule against every current passenger in the pool.
    const existing = await tx
      .select({ bearingDeg: rideRequests.bearingDeg })
      .from(rideRequests)
      .where(and(eq(rideRequests.poolId, poolId), inArray(rideRequests.status, ["MATCHED"])));
    if (
      !isDirectionCompatible(
        ride.bearingDeg,
        existing.map((e) => e.bearingDeg),
      )
    ) {
      throw badRequest("This trip is not going the same way", "DIRECTION_MISMATCH");
    }

    // Layer 2: capacity check while holding the lock.
    if (pool.seatsTaken + ride.seats > pool.capacity) {
      throw badRequest("Not enough seats left", "NO_SEATS");
    }

    // Layer 3 (DB CHECK) guards this update if anything above was wrong.
    await tx
      .update(pools)
      .set({ seatsTaken: pool.seatsTaken + ride.seats })
      .where(eq(pools.id, poolId));

    await tx
      .update(rideRequests)
      .set({ poolId, status: "MATCHED" })
      .where(eq(rideRequests.id, rideId));

    await tx.insert(statusHistory).values({
      entityType: "RIDE_REQUEST",
      entityId: rideId,
      fromStatus: "REQUESTED",
      toStatus: "MATCHED",
      changedBy: passengerId,
      reason: "Joined pool",
    });

    return { poolId, seatsTaken: pool.seatsTaken + ride.seats, capacity: pool.capacity };
  });
}

// Open pools a ride could join: same pickup area, ACCEPTED, seats free, compatible direction.
export async function findJoinablePools(pickupArea: string, seats: number, bearingDeg: number) {
  const open = await db
    .select()
    .from(pools)
    .where(and(eq(pools.status, "ACCEPTED"), eq(pools.pickupArea, pickupArea)));

  const result = [];
  for (const pool of open) {
    if (pool.seatsTaken + seats > pool.capacity) continue;
    const members = await db
      .select({ bearingDeg: rideRequests.bearingDeg })
      .from(rideRequests)
      .where(and(eq(rideRequests.poolId, pool.id), eq(rideRequests.status, "MATCHED")));
    if (
      isDirectionCompatible(
        bearingDeg,
        members.map((m) => m.bearingDeg),
      )
    ) {
      result.push(pool);
    }
  }
  return result;
}
