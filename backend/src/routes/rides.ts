import { Router } from "express";
import { authenticate, requireRole } from "../middleware/authenticate.ts";
import { validate } from "../middleware/validate.ts";
import { createRideSchema, estimateSchema, rideIdParams } from "../schemas/ride.ts";
import type { CreateRideInput, EstimateInput } from "../schemas/ride.ts";
import {
  cancelRide,
  createRide,
  estimateRide,
  getRideForPassenger,
  listRidesForPassenger,
} from "../services/ride-service.ts";

export const ridesRouter = Router();

ridesRouter.use(authenticate, requireRole("PASSENGER"));

ridesRouter.post("/estimate", validate({ body: estimateSchema }), (req, res) => {
  res.json(estimateRide(req.body as EstimateInput));
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

ridesRouter.post("/:id/cancel", validate({ params: rideIdParams }), async (req, res) => {
  const { id } = req.params as { id: string };
  const ride = await cancelRide(id, req.user!.userId);
  res.json({ ride });
});
