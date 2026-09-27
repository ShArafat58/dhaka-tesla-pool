import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../../lib/errors.ts";
import { resetSchema } from "../../test/setup.ts";
import { createUser, seedAreas } from "../../test/factories.ts";
import {
  cancelRide,
  createRide,
  estimateRide,
  getRideForPassenger,
  listRidesForPassenger,
} from "../ride-service.ts";

beforeEach(async () => {
  await resetSchema();
  await seedAreas();
});

const nusratTrip = {
  pickupArea: "BANANI" as const,
  dropoffArea: "MOHAKHALI" as const,
  seats: 1,
  paymentMethod: "CASH" as const,
};

describe("estimateRide", () => {
  it("returns the documented Nusrat fares", () => {
    const est = estimateRide({ pickupArea: "BANANI", dropoffArea: "MOHAKHALI", seats: 1 });
    expect(est.roadDistanceM).toBe(2300);
    expect(est.soloFarePaisa).toBe(8600);
    expect(est.pooledFarePaisa).toBe(6450);
  });
});

describe("createRide", () => {
  it("stores frozen distance, bearing and solo fare", async () => {
    const nusrat = await createUser("PASSENGER", "Nusrat");
    const ride = await createRide(nusrat.id, nusratTrip);
    expect(ride.status).toBe("REQUESTED");
    expect(ride.roadDistanceM).toBe(2300);
    expect(ride.bearingDeg).toBe(192);
    expect(ride.soloFarePaisa).toBe(8600);
  });
});

describe("authorization", () => {
  it("hides another passenger's ride", async () => {
    const nusrat = await createUser("PASSENGER", "Nusrat");
    const rafiq = await createUser("PASSENGER", "Rafiq");
    const ride = await createRide(nusrat.id, nusratTrip);

    await expect(getRideForPassenger(ride.id, rafiq.id)).rejects.toThrow(AppError);
  });

  it("stops a passenger cancelling someone else's ride", async () => {
    const nusrat = await createUser("PASSENGER", "Nusrat");
    const rafiq = await createUser("PASSENGER", "Rafiq");
    const ride = await createRide(nusrat.id, nusratTrip);

    await expect(cancelRide(ride.id, rafiq.id)).rejects.toMatchObject({ statusCode: 403 });
    const stillThere = await getRideForPassenger(ride.id, nusrat.id);
    expect(stillThere.status).toBe("REQUESTED");
  });

  it("only lists the caller's own rides", async () => {
    const nusrat = await createUser("PASSENGER", "Nusrat");
    const rafiq = await createUser("PASSENGER", "Rafiq");
    await createRide(nusrat.id, nusratTrip);

    expect(await listRidesForPassenger(rafiq.id)).toHaveLength(0);
    expect(await listRidesForPassenger(nusrat.id)).toHaveLength(1);
  });
});

describe("cancellation rules", () => {
  it("cancels a REQUESTED ride", async () => {
    const nusrat = await createUser("PASSENGER", "Nusrat");
    const ride = await createRide(nusrat.id, nusratTrip);
    const cancelled = await cancelRide(ride.id, nusrat.id);
    expect(cancelled?.status).toBe("CANCELLED");
  });

  it("refuses to cancel an already cancelled ride", async () => {
    const nusrat = await createUser("PASSENGER", "Nusrat");
    const ride = await createRide(nusrat.id, nusratTrip);
    await cancelRide(ride.id, nusrat.id);
    await expect(cancelRide(ride.id, nusrat.id)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });
});
