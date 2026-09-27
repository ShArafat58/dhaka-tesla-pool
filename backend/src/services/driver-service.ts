import { and, desc, eq, isNull, ne } from "drizzle-orm";
import type { PoolStatus, RideStatus } from "@dtp/shared";
import { db } from "../db/client.ts";
import { pools, rideRequests, statusHistory, vehicles } from "../db/schema.ts";
import { badRequest, forbidden, notFound } from "../lib/errors.ts";
import { canTransitionPool, canTransitionRide } from "../lib/state-machine.ts";

async function getOwnedVehicle(driverId: string) {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.driverId, driverId))
    .limit(1);
  if (!vehicle) {
    throw notFound("No vehicle is registered to this driver");
  }
  return vehicle;
}

export function getMyVehicle(driverId: string) {
  return getOwnedVehicle(driverId);
}

export async function setOnline(driverId: string, isOnline: boolean) {
  const vehicle = await getOwnedVehicle(driverId);
  const [updated] = await db
    .update(vehicles)
    .set({ isOnline })
    .where(eq(vehicles.id, vehicle.id))
    .returning();
  return updated;
}

// Requests a driver may act on: not yet in a pool and still REQUESTED.
export function listOpenRequests() {
  return db
    .select()
    .from(rideRequests)
    .where(and(eq(rideRequests.status, "REQUESTED"), isNull(rideRequests.poolId)))
    .orderBy(desc(rideRequests.createdAt));
}

export async function getMyActivePool(driverId: string) {
  const [pool] = await db
    .select()
    .from(pools)
    .where(
      and(
        eq(pools.driverId, driverId),
        ne(pools.status, "COMPLETED"),
        ne(pools.status, "CANCELLED"),
      ),
    )
    .orderBy(desc(pools.createdAt))
    .limit(1);
  if (!pool) return null;

  const passengers = await db.select().from(rideRequests).where(eq(rideRequests.poolId, pool.id));
  return { pool, passengers };
}

// Driver accepts a REQUESTED ride: creates a pool and matches the ride into it.
export async function acceptRide(driverId: string, rideId: string) {
  const vehicle = await getOwnedVehicle(driverId);
  if (!vehicle.isOnline) {
    throw badRequest("Go online before accepting rides", "DRIVER_OFFLINE");
  }

  return db.transaction(async (tx) => {
    const [ride] = await tx
      .select()
      .from(rideRequests)
      .where(eq(rideRequests.id, rideId))
      .for("update")
      .limit(1);

    if (!ride) throw notFound("Ride not found");
    if (ride.poolId || ride.status !== "REQUESTED") {
      throw badRequest("This ride is no longer available", "RIDE_UNAVAILABLE");
    }
    if (ride.seats > vehicle.capacity) {
      throw badRequest("Not enough seats in the vehicle", "OVER_CAPACITY");
    }

    const [pool] = await tx
      .insert(pools)
      .values({
        vehicleId: vehicle.id,
        driverId,
        pickupArea: ride.pickupArea,
        status: "ACCEPTED",
        seatsTaken: ride.seats,
      })
      .returning();
    if (!pool) throw new Error("Failed to create pool");

    await tx
      .update(rideRequests)
      .set({ poolId: pool.id, status: "MATCHED" })
      .where(eq(rideRequests.id, ride.id));

    await tx.insert(statusHistory).values([
      {
        entityType: "POOL",
        entityId: pool.id,
        fromStatus: null,
        toStatus: "ACCEPTED",
        changedBy: driverId,
        reason: "Driver accepted ride",
      },
      {
        entityType: "RIDE_REQUEST",
        entityId: ride.id,
        fromStatus: "REQUESTED",
        toStatus: "MATCHED",
        changedBy: driverId,
        reason: "Matched into pool",
      },
    ]);

    return pool;
  });
}

// When the pool moves, each active ride in it moves to the paired status.
const POOL_TO_RIDE: Partial<Record<PoolStatus, { from: RideStatus; to: RideStatus }>> = {
  ARRIVED: { from: "MATCHED", to: "DRIVER_ARRIVED" },
  IN_PROGRESS: { from: "DRIVER_ARRIVED", to: "STARTED" },
  COMPLETED: { from: "STARTED", to: "COMPLETED" },
};

async function advancePool(driverId: string, poolId: string, to: PoolStatus, reason: string) {
  return db.transaction(async (tx) => {
    const [pool] = await tx.select().from(pools).where(eq(pools.id, poolId)).for("update").limit(1);
    if (!pool) throw notFound("Pool not found");
    if (pool.driverId !== driverId) throw forbidden("This is not your pool");
    if (!canTransitionPool(pool.status, to)) {
      throw badRequest(`A pool in ${pool.status} cannot move to ${to}`, "INVALID_TRANSITION");
    }

    await tx.update(pools).set({ status: to }).where(eq(pools.id, poolId));
    await tx.insert(statusHistory).values({
      entityType: "POOL",
      entityId: poolId,
      fromStatus: pool.status,
      toStatus: to,
      changedBy: driverId,
      reason,
    });

    const rideMove = POOL_TO_RIDE[to];
    if (rideMove) {
      const activeRides = await tx
        .select()
        .from(rideRequests)
        .where(and(eq(rideRequests.poolId, poolId), eq(rideRequests.status, rideMove.from)));

      for (const ride of activeRides) {
        if (!canTransitionRide(ride.status, rideMove.to)) continue;
        await tx
          .update(rideRequests)
          .set({ status: rideMove.to })
          .where(eq(rideRequests.id, ride.id));
        await tx.insert(statusHistory).values({
          entityType: "RIDE_REQUEST",
          entityId: ride.id,
          fromStatus: ride.status,
          toStatus: rideMove.to,
          changedBy: driverId,
          reason,
        });
      }
    }

    return { poolId, status: to };
  });
}

export function markArrived(driverId: string, poolId: string) {
  return advancePool(driverId, poolId, "ARRIVED", "Driver arrived");
}
export function startTrip(driverId: string, poolId: string) {
  return advancePool(driverId, poolId, "IN_PROGRESS", "Trip started");
}
export function completeTrip(driverId: string, poolId: string) {
  return advancePool(driverId, poolId, "COMPLETED", "Trip completed");
}
