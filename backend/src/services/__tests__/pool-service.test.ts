import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { pools, rideRequests } from "../../db/schema.ts";
import { resetSchema } from "../../test/setup.ts";
import { createUser, createVehicle, seedAreas } from "../../test/factories.ts";
import { createRide } from "../ride-service.ts";
import { acceptRide, setOnline } from "../driver-service.ts";
import { joinPool } from "../pool-service.ts";

const banani = (dropoff: "MOHAKHALI" | "GULSHAN_1", seats = 1) => ({
  pickupArea: "BANANI" as const,
  dropoffArea: dropoff,
  seats,
  paymentMethod: "CASH" as const,
});

// Sets up Jashim online with Bullet (capacity 3) and a pool started by Nusrat.
async function poolWithNusrat(capacity = 3) {
  const jashim = await createUser("DRIVER", "Jashim");
  await createVehicle(jashim.id, capacity);
  await setOnline(jashim.id, true);

  const nusrat = await createUser("PASSENGER", "Nusrat");
  const nusratRide = await createRide(nusrat.id, banani("MOHAKHALI"));
  const pool = await acceptRide(jashim.id, nusratRide.id);
  return { jashim, pool: pool!, nusratRide };
}

beforeEach(async () => {
  await resetSchema();
  await seedAreas();
});

describe("joinPool", () => {
  it("lets Rafiq join Nusrat's compatible pool", async () => {
    const { pool } = await poolWithNusrat();
    const rafiq = await createUser("PASSENGER", "Rafiq");
    const rafiqRide = await createRide(rafiq.id, banani("GULSHAN_1"));

    const result = await joinPool(rafiq.id, pool.id, rafiqRide.id);
    expect(result.seatsTaken).toBe(2);

    const [ride] = await db.select().from(rideRequests).where(eq(rideRequests.id, rafiqRide.id));
    expect(ride?.status).toBe("MATCHED");
  });

  it("rejects a rider going the opposite way", async () => {
    const { pool } = await poolWithNusrat();
    const other = await createUser("PASSENGER", "Farhan");
    // Banani -> Uttara is ~153 degrees away from Nusrat's Mohakhali bearing.
    const ride = await createRide(other.id, {
      pickupArea: "BANANI",
      dropoffArea: "UTTARA",
      seats: 1,
      paymentMethod: "CASH",
    });
    await expect(joinPool(other.id, pool.id, ride.id)).rejects.toMatchObject({
      code: "DIRECTION_MISMATCH",
    });
  });

  it("rejects joining with someone else's ride", async () => {
    const { pool } = await poolWithNusrat();
    const rafiq = await createUser("PASSENGER", "Rafiq");
    const shirin = await createUser("PASSENGER", "Shirin");
    const rafiqRide = await createRide(rafiq.id, banani("GULSHAN_1"));

    await expect(joinPool(shirin.id, pool.id, rafiqRide.id)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  // The critical concurrency test: Bullet has 1 seat left, Nusrat already in it.
  // Rafiq and Shirin both try to grab the last seat at the same instant.
  it("gives the last seat to exactly one of two racing riders", async () => {
    // capacity 2, Nusrat already takes 1 -> exactly one seat left.
    const { pool } = await poolWithNusrat(2);

    const rafiq = await createUser("PASSENGER", "Rafiq");
    const shirin = await createUser("PASSENGER", "Shirin");
    const rafiqRide = await createRide(rafiq.id, banani("GULSHAN_1"));
    const shirinRide = await createRide(shirin.id, banani("GULSHAN_1"));

    // Fire both joins in parallel.
    const results = await Promise.allSettled([
      joinPool(rafiq.id, pool.id, rafiqRide.id),
      joinPool(shirin.id, pool.id, shirinRide.id),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    // Exactly one wins, one loses.
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // The pool is exactly full, never over capacity.
    const [finalPool] = await db.select().from(pools).where(eq(pools.id, pool.id));
    expect(finalPool?.seatsTaken).toBe(2);
    expect(finalPool!.seatsTaken).toBeLessThanOrEqual(finalPool!.capacity);

    // Exactly one of the two rides is MATCHED, the other still REQUESTED.
    const [rafiqAfter] = await db
      .select()
      .from(rideRequests)
      .where(eq(rideRequests.id, rafiqRide.id));
    const [shirinAfter] = await db
      .select()
      .from(rideRequests)
      .where(eq(rideRequests.id, shirinRide.id));
    const matched = [rafiqAfter, shirinAfter].filter((r) => r?.status === "MATCHED");
    expect(matched).toHaveLength(1);
  });

  it("never exceeds capacity even under repeated races", async () => {
    // Run the race several times to make sure the guarantee is not luck.
    for (let i = 0; i < 5; i++) {
      await resetSchema();
      await seedAreas();
      const { pool } = await poolWithNusrat(2);

      const a = await createUser("PASSENGER", "RiderA");
      const b = await createUser("PASSENGER", "RiderB");
      const rideA = await createRide(a.id, banani("GULSHAN_1"));
      const rideB = await createRide(b.id, banani("GULSHAN_1"));

      await Promise.allSettled([
        joinPool(a.id, pool.id, rideA.id),
        joinPool(b.id, pool.id, rideB.id),
      ]);

      const [finalPool] = await db.select().from(pools).where(eq(pools.id, pool.id));
      expect(finalPool!.seatsTaken).toBeLessThanOrEqual(finalPool!.capacity);
      expect(finalPool?.seatsTaken).toBe(2);
    }
  });
});
