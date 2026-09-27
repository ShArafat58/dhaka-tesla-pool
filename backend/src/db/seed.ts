import { hash } from "bcryptjs";
import { AREAS } from "@dtp/shared";
import { db } from "./client.ts";
import { areas, users, vehicles, wallets } from "./schema.ts";

const DEMO_PASSWORD = "password123";
const BULLET_CAPACITY = 3;
const STARTING_BALANCE_PAISA = 50_000;

async function seed() {
  // Wipe in dependency order so re-running the seed is safe.
  await db.delete(wallets);
  await db.delete(vehicles);
  await db.delete(users);
  await db.delete(areas);

  await db.insert(areas).values(AREAS.map((a) => ({ ...a })));

  const passwordHash = await hash(DEMO_PASSWORD, 10);

  const [jashim, nusrat, rafiq, shirin] = await db
    .insert(users)
    .values([
      { name: "Jashim", email: "jashim@tesla.pool", passwordHash, role: "DRIVER" },
      { name: "Nusrat", email: "nusrat@tesla.pool", passwordHash, role: "PASSENGER" },
      { name: "Rafiq", email: "rafiq@tesla.pool", passwordHash, role: "PASSENGER" },
      { name: "Shirin", email: "shirin@tesla.pool", passwordHash, role: "PASSENGER" },
    ])
    .returning();

  if (!jashim || !nusrat || !rafiq || !shirin) {
    throw new Error("Failed to insert demo users.");
  }

  await db.insert(vehicles).values({
    driverId: jashim.id,
    name: "Bullet",
    capacity: BULLET_CAPACITY,
    isOnline: false,
  });

  // Passengers get a TeslaPay wallet; the driver does not need one.
  await db.insert(wallets).values(
    [nusrat, rafiq, shirin].map((p) => ({
      userId: p.id,
      balancePaisa: STARTING_BALANCE_PAISA,
    })),
  );

  // eslint-disable-next-line no-console
  console.log("Seed complete: Jashim (driver, Bullet), Nusrat, Rafiq, Shirin.");
  process.exit(0);
}

seed().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", error);
  process.exit(1);
});
