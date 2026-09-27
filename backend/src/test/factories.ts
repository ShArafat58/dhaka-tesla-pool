import { hash } from "bcryptjs";
import { AREAS } from "@dtp/shared";
import type { UserRole } from "@dtp/shared";
import { db } from "../db/client.ts";
import { areas, users, vehicles } from "../db/schema.ts";

export async function seedAreas(): Promise<void> {
  await db.insert(areas).values(AREAS.map((a) => ({ ...a })));
}

let counter = 0;

export async function createUser(role: UserRole, name = `User${++counter}`) {
  const passwordHash = await hash("password123", 4);
  const [user] = await db
    .insert(users)
    .values({ name, email: `${name.toLowerCase()}-${counter}@test.pool`, passwordHash, role })
    .returning();
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function createVehicle(driverId: string, capacity = 3, name = "Bullet") {
  const [vehicle] = await db
    .insert(vehicles)
    .values({ driverId, name, capacity, isOnline: true })
    .returning();
  if (!vehicle) throw new Error("Failed to create vehicle");
  return vehicle;
}
