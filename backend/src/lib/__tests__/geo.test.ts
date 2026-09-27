import { describe, expect, it } from "vitest";
import { roadDistanceMetres, tripBearing } from "../geo.ts";

describe("geo", () => {
  it("matches the documented Banani -> Mohakhali distance", () => {
    expect(roadDistanceMetres("BANANI", "MOHAKHALI")).toBe(2300);
  });

  it("matches the documented Banani -> Gulshan 1 distance", () => {
    expect(roadDistanceMetres("BANANI", "GULSHAN_1")).toBe(2500);
  });

  it("matches the documented bearings", () => {
    expect(tripBearing("BANANI", "MOHAKHALI")).toBe(192);
    expect(tripBearing("BANANI", "GULSHAN_1")).toBe(140);
  });
});
