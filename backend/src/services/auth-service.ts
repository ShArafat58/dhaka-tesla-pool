import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { users, wallets } from "../db/schema.ts";
import { conflict, unauthorized } from "../lib/errors.ts";
import type { SigninInput, SignupInput } from "../schemas/auth.ts";

const BCRYPT_ROUNDS = 10;
const PASSENGER_STARTING_BALANCE_PAISA = 50_000;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: (typeof users.$inferSelect)["role"];
};

function toPublicUser(row: typeof users.$inferSelect): PublicUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function registerUser(input: SignupInput): Promise<PublicUser> {
  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing.length > 0) {
    throw conflict("An account with this email already exists", "EMAIL_TAKEN");
  }

  const passwordHash = await hash(input.password, BCRYPT_ROUNDS);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create user");
    }

    if (created.role === "PASSENGER") {
      await tx.insert(wallets).values({
        userId: created.id,
        balancePaisa: PASSENGER_STARTING_BALANCE_PAISA,
      });
    }

    return toPublicUser(created);
  });
}

export async function verifyCredentials(input: SigninInput): Promise<PublicUser> {
  const [row] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!row) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const passwordMatches = await compare(input.password, row.passwordHash);
  if (!passwordMatches) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  return toPublicUser(row);
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ? toPublicUser(row) : null;
}
