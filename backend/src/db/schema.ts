import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  ENTITY_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  POOL_STATUSES,
  RIDE_STATUSES,
  USER_ROLES,
} from "@dtp/shared";
import type {
  EntityType,
  PaymentMethod,
  PaymentStatus,
  PoolStatus,
  RideStatus,
  UserRole,
} from "@dtp/shared";

// Enums are stored as text + CHECK, not a Postgres ENUM type, so adding a value
// is a plain migration instead of an ALTER TYPE.
const inList = (column: string, values: readonly string[]) =>
  sql.raw(`${column} IN (${values.map((v) => `'${v}'`).join(", ")})`);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<UserRole>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_key").on(t.email),
    check("users_role_check", inList("role", USER_ROLES)),
  ],
);

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    balancePaisa: integer("balance_paisa").notNull().default(0),
  },
  (t) => [
    uniqueIndex("wallets_user_id_key").on(t.userId),
    check("wallets_balance_non_negative", sql`${t.balancePaisa} >= 0`),
  ],
);

export const areas = pgTable("areas", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
});

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    capacity: integer("capacity").notNull(),
    isOnline: boolean("is_online").notNull().default(false),
  },
  (t) => [
    uniqueIndex("vehicles_driver_id_key").on(t.driverId),
    check("vehicles_capacity_positive", sql`${t.capacity} > 0`),
  ],
);

export const pools = pgTable(
  "pools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "restrict" }),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    pickupArea: text("pickup_area")
      .notNull()
      .references(() => areas.code, { onDelete: "restrict" }),
    status: text("status").$type<PoolStatus>().notNull().default("FORMING"),
    capacity: integer("capacity").notNull(),
    seatsTaken: integer("seats_taken").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pools_driver_status_idx").on(t.driverId, t.status),
    check("pools_status_check", inList("status", POOL_STATUSES)),
    check("pools_seats_non_negative", sql`${t.seatsTaken} >= 0`),
    check("pools_seats_within_capacity", sql`${t.seatsTaken} <= ${t.capacity}`),
  ],
);

export const rideRequests = pgTable(
  "ride_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    passengerId: uuid("passenger_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    poolId: uuid("pool_id").references(() => pools.id, { onDelete: "set null" }),
    pickupArea: text("pickup_area")
      .notNull()
      .references(() => areas.code, { onDelete: "restrict" }),
    dropoffArea: text("dropoff_area")
      .notNull()
      .references(() => areas.code, { onDelete: "restrict" }),
    seats: integer("seats").notNull(),
    roadDistanceM: integer("road_distance_m").notNull(),
    bearingDeg: integer("bearing_deg").notNull(),
    soloFarePaisa: integer("solo_fare_paisa").notNull(),
    finalFarePaisa: integer("final_fare_paisa"),
    status: text("status").$type<RideStatus>().notNull().default("REQUESTED"),
    paymentMethod: text("payment_method").$type<PaymentMethod>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ride_requests_passenger_idx").on(t.passengerId),
    index("ride_requests_pool_idx").on(t.poolId),
    index("ride_requests_status_idx").on(t.status),
    check("ride_requests_status_check", inList("status", RIDE_STATUSES)),
    check("ride_requests_seats_positive", sql`${t.seats} > 0`),
    check("ride_requests_payment_method_check", inList("payment_method", PAYMENT_METHODS)),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rideRequestId: uuid("ride_request_id")
      .notNull()
      .references(() => rideRequests.id, { onDelete: "cascade" }),
    amountPaisa: integer("amount_paisa").notNull(),
    method: text("method").$type<PaymentMethod>().notNull(),
    status: text("status").$type<PaymentStatus>().notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_ride_request_id_key").on(t.rideRequestId),
    check("payments_method_check", inList("method", PAYMENT_METHODS)),
    check("payments_status_check", inList("status", PAYMENT_STATUSES)),
  ],
);

export const statusHistory = pgTable(
  "status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").$type<EntityType>().notNull(),
    entityId: uuid("entity_id").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("status_history_entity_idx").on(t.entityType, t.entityId),
    check("status_history_entity_type_check", inList("entity_type", ENTITY_TYPES)),
  ],
);
