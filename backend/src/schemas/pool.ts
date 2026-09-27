import { z } from "zod";

export const joinPoolSchema = z.object({
  poolId: z.string().uuid(),
  rideId: z.string().uuid(),
});

export type JoinPoolInput = z.infer<typeof joinPoolSchema>;
