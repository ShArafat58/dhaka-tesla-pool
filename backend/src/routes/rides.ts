import { Router } from "express";
import { authenticate, requireRole } from "../middleware/authenticate.ts";
import { validate } from "../middleware/validate.ts";
import { createRideSchema, estimateSchema, rideIdParams } from "../schemas/ride.ts";
import type { CreateRideInput, EstimateInput } from "../schemas/ride.ts";
import { joinPoolSchema } from "../schemas/pool.ts";
import type { JoinPoolInput } from "../schemas/pool.ts";
import {
  cancelRide,
  createRide,
  estimateRide,
  getRideForPassenger,
  listRidesForPassenger,
} from "../services/ride-service.ts";
import { findJoinablePools, joinPool } from "../services/pool-service.ts";

export const ridesRouter = Router();

ridesRouter.use(authenticate, requireRole("PASSENGER"));

ridesRouter.post("/estimate", validate({ body: estimateSchema }), (req, res) => {
  res.json(estimateRide(req.body as EstimateInput));
});

ridesRouter.post("/join", validate({ body: joinPoolSchema }), async (req, res) => {
  const { poolId, rideId } = req.body as JoinPoolInput;
  const result = await joinPool(req.user!.userId, poolId, rideId);
  res.json({ result });
});

ridesRouter.post("/", validate({ body: createRideSchema }), async (req, res) => {
  const ride = await createRide(req.user!.userId, req.body as CreateRideInput);
  res.status(201).json({ ride });
});

ridesRouter.get("/", async (req, res) => {
  const rides = await listRidesForPassenger(req.user!.userId);
  res.json({ rides });
});

ridesRouter.get("/:id", validate({ params: rideIdParams }), async (req, res) => {
  const { id } = req.params as { id: string };
  const ride = await getRideForPassenger(id, req.user!.userId);
  res.json({ ride });
});

ridesRouter.get("/:id/pools", validate({ params: rideIdParams }), async (req, res) => {
  const { id } = req.params as { id: string };
  const ride = await getRideForPassenger(id, req.user!.userId);
  const pools = await findJoinablePools(ride.pickupArea, ride.seats, ride.bearingDeg);
  res.json({ pools });
});

ridesRouter.post("/:id/cancel", validate({ params: rideIdParams }), async (req, res) => {
  const { id } = req.params as { id: string };
  const ride = await cancelRide(id, req.user!.userId);
  res.json({ ride });
});
