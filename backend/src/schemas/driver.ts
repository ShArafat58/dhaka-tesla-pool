import { z } from "zod";

export const onlineSchema = z.object({ isOnline: z.boolean() });

export const poolIdParams = z.object({ id: z.string().uuid() });
export const rideIdParams = z.object({ id: z.string().uuid() });

export type OnlineInput = z.infer<typeof onlineSchema>;
