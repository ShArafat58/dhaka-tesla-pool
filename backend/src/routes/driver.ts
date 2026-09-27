import { Router } from "express";
import { authenticate, requireRole } from "../middleware/authenticate.ts";
import { validate } from "../middleware/validate.ts";
import { onlineSchema, poolIdParams, rideIdParams } from "../schemas/driver.ts";
import type { OnlineInput } from "../schemas/driver.ts";
import {
  acceptRide,
  completeTrip,
  getMyActivePool,
  getMyVehicle,
  listOpenRequests,
  markArrived,
  setOnline,
  startTrip,
} from "../services/driver-service.ts";

export const driverRouter = Router();

driverRouter.use(authenticate, requireRole("DRIVER"));

driverRouter.get("/vehicle", async (req, res) => {
  res.json({ vehicle: await getMyVehicle(req.user!.userId) });
});

driverRouter.patch("/online", validate({ body: onlineSchema }), async (req, res) => {
  const { isOnline } = req.body as OnlineInput;
  res.json({ vehicle: await setOnline(req.user!.userId, isOnline) });
});

driverRouter.get("/requests", async (_req, res) => {
  res.json({ requests: await listOpenRequests() });
});

driverRouter.get("/pool", async (req, res) => {
  res.json({ pool: await getMyActivePool(req.user!.userId) });
});

driverRouter.post("/rides/:id/accept", validate({ params: rideIdParams }), async (req, res) => {
  const { id } = req.params as { id: string };
  res.status(201).json({ pool: await acceptRide(req.user!.userId, id) });
});

driverRouter.post("/pools/:id/arrive", validate({ params: poolIdParams }), async (req, res) => {
  const { id } = req.params as { id: string };
  res.json({ pool: await markArrived(req.user!.userId, id) });
});

driverRouter.post("/pools/:id/start", validate({ params: poolIdParams }), async (req, res) => {
  const { id } = req.params as { id: string };
  res.json({ pool: await startTrip(req.user!.userId, id) });
});

driverRouter.post("/pools/:id/complete", validate({ params: poolIdParams }), async (req, res) => {
  const { id } = req.params as { id: string };
  res.json({ pool: await completeTrip(req.user!.userId, id) });
});
