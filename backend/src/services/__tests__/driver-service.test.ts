import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { rideRequests } from "../../db/schema.ts";
import { resetSchema } from "../../test/setup.ts";
import { createUser, createVehicle, seedAreas } from "../../test/factories.ts";
import { createRide } from "../ride-service.ts";
import {
  acceptRide,
  completeTrip,
  listOpenRequests,
  markArrived,
  setOnline,
  startTrip,
} from "../driver-service.ts";

const trip = {
  pickupArea: "BANANI" as const,
  dropoffArea: "MOHAKHALI" as const,
  seats: 1,
  paymentMethod: "CASH" as const,
};

async function setupDriverAndRide() {
  const jashim = await createUser("DRIVER", "Jashim");
  await createVehicle(jashim.id, 3);
  await setOnline(jashim.id, true);
  const nusrat = await createUser("PASSENGER", "Nusrat");
  const ride = await createRide(nusrat.id, trip);
  return { jashim, nusrat, ride };
}

beforeEach(async () => {
  await resetSchema();
  await seedAreas();
});

describe("open requests", () => {
  it("lists only unpooled REQUESTED rides", async () => {
    const { ride } = await setupDriverAndRide();
    const open = await listOpenRequests();
    expect(open.map((r) => r.id)).toContain(ride.id);
  });
});

describe("driver lifecycle", () => {
  it("runs accept -> arrive -> start -> complete", async () => {
    const { jashim, ride } = await setupDriverAndRide();

    const pool = await acceptRide(jashim.id, ride.id);
    expect(pool?.status).toBe("ACCEPTED");
    expect(pool?.seatsTaken).toBe(1);
    expect(await rideStatus(ride.id)).toBe("MATCHED");

    await markArrived(jashim.id, pool!.id);
    expect(await rideStatus(ride.id)).toBe("DRIVER_ARRIVED");

    await startTrip(jashim.id, pool!.id);
    expect(await rideStatus(ride.id)).toBe("STARTED");

    await completeTrip(jashim.id, pool!.id);
    expect(await rideStatus(ride.id)).toBe("COMPLETED");
  });

  it("rejects an invalid transition (start before arrive)", async () => {
    const { jashim, ride } = await setupDriverAndRide();
    const pool = await acceptRide(jashim.id, ride.id);
    await expect(startTrip(jashim.id, pool!.id)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });

  it("stops an offline driver from accepting", async () => {
    const { jashim, ride } = await setupDriverAndRide();
    await setOnline(jashim.id, false);
    await expect(acceptRide(jashim.id, ride.id)).rejects.toMatchObject({ code: "DRIVER_OFFLINE" });
  });

  it("stops a driver acting on someone else's pool", async () => {
    const { jashim, ride } = await setupDriverAndRide();
    const pool = await acceptRide(jashim.id, ride.id);

    const other = await createUser("DRIVER", "OtherDriver");
    await createVehicle(other.id, 3);
    await expect(markArrived(other.id, pool!.id)).rejects.toMatchObject({ statusCode: 403 });
  });
});

async function rideStatus(id: string) {
  const [row] = await db.select().from(rideRequests).where(eq(rideRequests.id, id)).limit(1);
  return row?.status;
}
