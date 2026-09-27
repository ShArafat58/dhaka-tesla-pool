import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { payments, rideRequests, wallets } from "../../db/schema.ts";
import { resetSchema } from "../../test/setup.ts";
import { createUser, createVehicle, seedAreas } from "../../test/factories.ts";
import { createRide } from "../ride-service.ts";
import { acceptRide, completeTrip, markArrived, setOnline, startTrip } from "../driver-service.ts";
import { joinPool } from "../pool-service.ts";

const banani = (
  dropoff: "MOHAKHALI" | "GULSHAN_1",
  paymentMethod: "CASH" | "TESLAPAY" = "CASH",
) => ({
  pickupArea: "BANANI" as const,
  dropoffArea: dropoff,
  seats: 1,
  paymentMethod,
});

async function onlineJashim(capacity = 3) {
  const jashim = await createUser("DRIVER", "Jashim");
  await createVehicle(jashim.id, capacity);
  await setOnline(jashim.id, true);
  return jashim;
}

async function giveWallet(userId: string, balancePaisa: number) {
  await db.insert(wallets).values({ userId, balancePaisa });
}

async function runToComplete(driverId: string, poolId: string) {
  await markArrived(driverId, poolId);
  await startTrip(driverId, poolId);
  await completeTrip(driverId, poolId);
}

beforeEach(async () => {
  await resetSchema();
  await seedAreas();
});

describe("fare finalization", () => {
  it("charges the solo fare when a passenger rides alone", async () => {
    const jashim = await onlineJashim();
    const nusrat = await createUser("PASSENGER", "Nusrat");
    const ride = await createRide(nusrat.id, banani("MOHAKHALI"));
    const pool = await acceptRide(jashim.id, ride.id);

    await runToComplete(jashim.id, pool!.id);

    const [after] = await db.select().from(rideRequests).where(eq(rideRequests.id, ride.id));
    expect(after?.finalFarePaisa).toBe(8600); // solo, no discount
  });

  it("applies the pooled discount to Nusrat and Rafiq", async () => {
    const jashim = await onlineJashim();
    const nusrat = await createUser("PASSENGER", "Nusrat");
    const rafiq = await createUser("PASSENGER", "Rafiq");

    const nusratRide = await createRide(nusrat.id, banani("MOHAKHALI"));
    const rafiqRide = await createRide(rafiq.id, banani("GULSHAN_1"));

    const pool = await acceptRide(jashim.id, nusratRide.id);
    await joinPool(rafiq.id, pool!.id, rafiqRide.id);

    await runToComplete(jashim.id, pool!.id);

    const [nusratAfter] = await db
      .select()
      .from(rideRequests)
      .where(eq(rideRequests.id, nusratRide.id));
    const [rafiqAfter] = await db
      .select()
      .from(rideRequests)
      .where(eq(rideRequests.id, rafiqRide.id));

    expect(nusratAfter?.finalFarePaisa).toBe(6450); // pooled
    expect(rafiqAfter?.finalFarePaisa).toBe(6750); // pooled
  });
});

describe("payment settlement", () => {
  it("records a cash payment as PAID", async () => {
    const jashim = await onlineJashim();
    const nusrat = await createUser("PASSENGER", "Nusrat");
    const ride = await createRide(nusrat.id, banani("MOHAKHALI", "CASH"));
    const pool = await acceptRide(jashim.id, ride.id);

    await runToComplete(jashim.id, pool!.id);

    const [payment] = await db.select().from(payments).where(eq(payments.rideRequestId, ride.id));
    expect(payment?.status).toBe("PAID");
    expect(payment?.method).toBe("CASH");
    expect(payment?.amountPaisa).toBe(8600);
  });

  it("deducts a TeslaPay fare from the wallet", async () => {
    const jashim = await onlineJashim();
    const nusrat = await createUser("PASSENGER", "Nusrat");
    await giveWallet(nusrat.id, 50_000);

    const ride = await createRide(nusrat.id, banani("MOHAKHALI", "TESLAPAY"));
    const pool = await acceptRide(jashim.id, ride.id);

    await runToComplete(jashim.id, pool!.id);

    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, nusrat.id));
    expect(wallet?.balancePaisa).toBe(50_000 - 8600);

    const [payment] = await db.select().from(payments).where(eq(payments.rideRequestId, ride.id));
    expect(payment?.method).toBe("TESLAPAY");
    expect(payment?.status).toBe("PAID");
  });

  it("rejects completion when the TeslaPay balance is too low", async () => {
    const jashim = await onlineJashim();
    const nusrat = await createUser("PASSENGER", "Nusrat");
    await giveWallet(nusrat.id, 100); // far below the fare

    const ride = await createRide(nusrat.id, banani("MOHAKHALI", "TESLAPAY"));
    const pool = await acceptRide(jashim.id, ride.id);
    await markArrived(jashim.id, pool!.id);
    await startTrip(jashim.id, pool!.id);

    await expect(completeTrip(jashim.id, pool!.id)).rejects.toMatchObject({
      code: "INSUFFICIENT_BALANCE",
    });

    // The whole completion rolled back: wallet untouched, no payment row.
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, nusrat.id));
    expect(wallet?.balancePaisa).toBe(100);
    const paid = await db.select().from(payments).where(eq(payments.rideRequestId, ride.id));
    expect(paid).toHaveLength(0);
  });
});
