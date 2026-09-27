import { and, desc, eq } from "drizzle-orm";
import { computeFare } from "@dtp/shared";
import type { AreaCode } from "@dtp/shared";
import { db } from "../db/client.ts";
import { rideRequests, statusHistory } from "../db/schema.ts";
import { forbidden, notFound } from "../lib/errors.ts";
import { roadDistanceMetres, tripBearing } from "../lib/geo.ts";
import { canTransitionRide } from "../lib/state-machine.ts";
import type { CreateRideInput, EstimateInput } from "../schemas/ride.ts";

export function estimateRide(input: EstimateInput) {
  const roadDistanceM = roadDistanceMetres(
    input.pickupArea as AreaCode,
    input.dropoffArea as AreaCode,
  );
  const solo = computeFare(roadDistanceM, input.seats, false);
  const pooled = computeFare(roadDistanceM, input.seats, true);
  return { roadDistanceM, soloFarePaisa: solo.farePaisa, pooledFarePaisa: pooled.farePaisa };
}

export async function createRide(passengerId: string, input: CreateRideInput) {
  const roadDistanceM = roadDistanceMetres(
    input.pickupArea as AreaCode,
    input.dropoffArea as AreaCode,
  );
  const bearingDeg = tripBearing(input.pickupArea as AreaCode, input.dropoffArea as AreaCode);
  const solo = computeFare(roadDistanceM, input.seats, false);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(rideRequests)
      .values({
        passengerId,
        pickupArea: input.pickupArea,
        dropoffArea: input.dropoffArea,
        seats: input.seats,
        roadDistanceM,
        bearingDeg,
        soloFarePaisa: solo.farePaisa,
        status: "REQUESTED",
        paymentMethod: input.paymentMethod,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create ride request");
    }

    await tx.insert(statusHistory).values({
      entityType: "RIDE_REQUEST",
      entityId: created.id,
      fromStatus: null,
      toStatus: "REQUESTED",
      changedBy: passengerId,
      reason: "Ride requested",
    });

    return created;
  });
}

export async function listRidesForPassenger(passengerId: string) {
  return db
    .select()
    .from(rideRequests)
    .where(eq(rideRequests.passengerId, passengerId))
    .orderBy(desc(rideRequests.createdAt));
}

export async function getRideForPassenger(rideId: string, passengerId: string) {
  const [ride] = await db
    .select()
    .from(rideRequests)
    .where(and(eq(rideRequests.id, rideId), eq(rideRequests.passengerId, passengerId)))
    .limit(1);
  if (!ride) {
    throw notFound("Ride not found");
  }
  return ride;
}

export async function cancelRide(rideId: string, passengerId: string) {
  return db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rideRequests).where(eq(rideRequests.id, rideId)).limit(1);

    if (!ride) {
      throw notFound("Ride not found");
    }
    if (ride.passengerId !== passengerId) {
      throw forbidden("You can only cancel your own ride");
    }
    if (!canTransitionRide(ride.status, "CANCELLED")) {
      throw forbidden(`A ride in ${ride.status} cannot be cancelled`, "INVALID_TRANSITION");
    }

    const [updated] = await tx
      .update(rideRequests)
      .set({ status: "CANCELLED" })
      .where(eq(rideRequests.id, rideId))
      .returning();

    await tx.insert(statusHistory).values({
      entityType: "RIDE_REQUEST",
      entityId: rideId,
      fromStatus: ride.status,
      toStatus: "CANCELLED",
      changedBy: passengerId,
      reason: "Cancelled by passenger",
    });

    return updated;
  });
}
