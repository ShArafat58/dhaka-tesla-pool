import { describe, expect, it } from "vitest";
import { computeFare } from "../fare.ts";

describe("computeFare", () => {
  // Worked example from docs/domain-rules.md. Nusrat: Banani -> Mohakhali, 2.3 km.
  it("computes Nusrat's pooled fare as 6450 paisa", () => {
    const fare = computeFare(2300, 1, true);
    expect(fare.distanceChargePaisa).toBe(4600);
    expect(fare.subtotalPaisa).toBe(8600);
    expect(fare.poolDiscountPaisa).toBe(2150);
    expect(fare.farePaisa).toBe(6450);
  });

  // Rafiq: Banani -> Gulshan 1, 2.5 km.
  it("computes Rafiq's pooled fare as 6750 paisa", () => {
    const fare = computeFare(2500, 1, true);
    expect(fare.subtotalPaisa).toBe(9000);
    expect(fare.poolDiscountPaisa).toBe(2250);
    expect(fare.farePaisa).toBe(6750);
  });

  it("applies no discount when not pooled", () => {
    const fare = computeFare(2300, 1, false);
    expect(fare.poolDiscountPaisa).toBe(0);
    expect(fare.farePaisa).toBe(8600);
  });

  it("charges per seat", () => {
    const solo = computeFare(2300, 1, false);
    const twoSeats = computeFare(2300, 2, false);
    expect(twoSeats.farePaisa).toBe(solo.farePaisa * 2);
  });

  it("keeps every amount an integer", () => {
    const fare = computeFare(3333, 1, true);
    for (const value of Object.values(fare)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
