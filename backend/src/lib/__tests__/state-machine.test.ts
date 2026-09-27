import { describe, expect, it } from "vitest";
import { canTransitionPool, canTransitionRide } from "../state-machine.ts";

describe("ride state machine", () => {
  it("allows the documented happy path", () => {
    expect(canTransitionRide("REQUESTED", "MATCHED")).toBe(true);
    expect(canTransitionRide("MATCHED", "DRIVER_ARRIVED")).toBe(true);
    expect(canTransitionRide("DRIVER_ARRIVED", "STARTED")).toBe(true);
    expect(canTransitionRide("STARTED", "COMPLETED")).toBe(true);
  });

  it("allows cancelling before the trip starts", () => {
    expect(canTransitionRide("REQUESTED", "CANCELLED")).toBe(true);
    expect(canTransitionRide("MATCHED", "CANCELLED")).toBe(true);
    expect(canTransitionRide("DRIVER_ARRIVED", "CANCELLED")).toBe(true);
  });

  it("rejects cancelling once started", () => {
    expect(canTransitionRide("STARTED", "CANCELLED")).toBe(false);
  });

  it("rejects skipping states", () => {
    expect(canTransitionRide("REQUESTED", "STARTED")).toBe(false);
    expect(canTransitionRide("REQUESTED", "COMPLETED")).toBe(false);
  });

  it("treats completed and cancelled as terminal", () => {
    expect(canTransitionRide("COMPLETED", "STARTED")).toBe(false);
    expect(canTransitionRide("CANCELLED", "REQUESTED")).toBe(false);
  });
});

describe("pool state machine", () => {
  it("allows the documented happy path", () => {
    expect(canTransitionPool("FORMING", "ACCEPTED")).toBe(true);
    expect(canTransitionPool("ACCEPTED", "ARRIVED")).toBe(true);
    expect(canTransitionPool("ARRIVED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionPool("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("rejects skipping states", () => {
    expect(canTransitionPool("FORMING", "IN_PROGRESS")).toBe(false);
    expect(canTransitionPool("ARRIVED", "CANCELLED")).toBe(false);
  });
});
