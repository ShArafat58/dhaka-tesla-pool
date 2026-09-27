import { and, eq } from "drizzle-orm";
import { computeFare } from "@dtp/shared";
import { badRequest } from "../lib/errors.ts";
import { payments, rideRequests, wallets } from "../db/schema.ts";
import type { db as Database } from "../db/client.ts";

type Tx = Parameters<Parameters<typeof Database.transaction>[0]>[0];

// Called when the trip starts. Freezes each active ride's final fare.
// Pooled discount applies only if the pool carries 2+ passengers at this moment.
export async function finalizeFaresForPool(tx: Tx, poolId: string): Promise<void> {
  const rides = await tx
    .select()
    .from(rideRequests)
    .where(and(eq(rideRequests.poolId, poolId), eq(rideRequests.status, "DRIVER_ARRIVED")));

  const pooled = rides.length >= 2;

  for (const ride of rides) {
    const fare = computeFare(ride.roadDistanceM, ride.seats, pooled);
    await tx
      .update(rideRequests)
      .set({ finalFarePaisa: fare.farePaisa })
      .where(eq(rideRequests.id, ride.id));
  }
}

// Called when the trip completes. Settles payment for each ride in the pool.
// Cash is recorded as PAID; TeslaPay is deducted from the wallet in the same
// transaction. The wallet CHECK constraint blocks any negative balance.
export async function settlePaymentsForPool(tx: Tx, poolId: string): Promise<void> {
  const rides = await tx
    .select()
    .from(rideRequests)
    .where(and(eq(rideRequests.poolId, poolId), eq(rideRequests.status, "STARTED")));

  for (const ride of rides) {
    const amount = ride.finalFarePaisa ?? ride.soloFarePaisa;

    if (ride.paymentMethod === "TESLAPAY") {
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, ride.passengerId))
        .for("update")
        .limit(1);

      if (!wallet || wallet.balancePaisa < amount) {
        throw badRequest("Insufficient TeslaPay balance", "INSUFFICIENT_BALANCE");
      }

      await tx
        .update(wallets)
        .set({ balancePaisa: wallet.balancePaisa - amount })
        .where(eq(wallets.id, wallet.id));
    }

    await tx.insert(payments).values({
      rideRequestId: ride.id,
      amountPaisa: amount,
      method: ride.paymentMethod,
      status: "PAID",
    });
  }
}
