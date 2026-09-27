import { z } from "zod";
import { AREAS, PAYMENT_METHODS } from "@dtp/shared";

const areaCodes = AREAS.map((a) => a.code) as [string, ...string[]];

const tripFields = {
  pickupArea: z.enum(areaCodes),
  dropoffArea: z.enum(areaCodes),
  seats: z.coerce.number().int().min(1).max(3),
};

export const estimateSchema = z.object(tripFields).refine((v) => v.pickupArea !== v.dropoffArea, {
  message: "Pickup and drop-off must differ",
  path: ["dropoffArea"],
});

export const createRideSchema = z
  .object({ ...tripFields, paymentMethod: z.enum(PAYMENT_METHODS) })
  .refine((v) => v.pickupArea !== v.dropoffArea, {
    message: "Pickup and drop-off must differ",
    path: ["dropoffArea"],
  });

export const rideIdParams = z.object({ id: z.string().uuid() });

export type EstimateInput = z.infer<typeof estimateSchema>;
export type CreateRideInput = z.infer<typeof createRideSchema>;
