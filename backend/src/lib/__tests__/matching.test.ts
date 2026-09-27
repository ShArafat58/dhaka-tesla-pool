import { describe, expect, it } from "vitest";
import { bearingDifference, isDirectionCompatible } from "../matching.ts";

describe("matching", () => {
  it("measures the short way around the compass", () => {
    expect(bearingDifference(10, 350)).toBe(20);
    expect(bearingDifference(140, 192)).toBe(52);
  });

  it("lets Nusrat and Rafiq share (52 degrees apart)", () => {
    expect(isDirectionCompatible(192, [140])).toBe(true);
  });

  it("rejects a rider heading the opposite way", () => {
    // Banani -> Uttara (345) vs Nusrat (192): 153 degrees apart.
    expect(isDirectionCompatible(345, [192])).toBe(false);
  });

  it("requires compatibility with every existing passenger", () => {
    // Dhanmondi (210) fits Nusrat (192) but not Rafiq (140): 70 > 60.
    expect(isDirectionCompatible(210, [192])).toBe(true);
    expect(isDirectionCompatible(210, [192, 140])).toBe(false);
  });
});
