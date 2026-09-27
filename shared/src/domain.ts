// Domain enums and area data shared by the API, the web app and the tests.
// This file is the single source of truth for status values, roles and area codes.

/** A user is either a passenger or a driver. Roles are fixed at signup. */
export const USER_ROLES = ["PASSENGER", "DRIVER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Payment method chosen per ride request. */
export const PAYMENT_METHODS = ["CASH", "TESLAPAY"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Whether a payment has been settled. */
export const PAYMENT_STATUSES = ["PENDING", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** One passenger's journey. See docs/lifecycle.md. */
export const RIDE_STATUSES = [
  "REQUESTED",
  "MATCHED",
  "DRIVER_ARRIVED",
  "STARTED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type RideStatus = (typeof RIDE_STATUSES)[number];

/** One Tesla trip that carries one or more ride requests. See docs/lifecycle.md. */
export const POOL_STATUSES = [
  "FORMING",
  "ACCEPTED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type PoolStatus = (typeof POOL_STATUSES)[number];

/** Which state machine a status_history row belongs to. */
export const ENTITY_TYPES = ["RIDE_REQUEST", "POOL"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Fixed Dhaka areas. Coordinates are one representative point per area. */
export const AREAS = [
  { code: "BANANI", name: "Banani", latitude: 23.794, longitude: 90.4043 },
  { code: "GULSHAN_1", name: "Gulshan 1", latitude: 23.7806, longitude: 90.4166 },
  { code: "GULSHAN_2", name: "Gulshan 2", latitude: 23.7949, longitude: 90.4143 },
  { code: "MOHAKHALI", name: "Mohakhali", latitude: 23.7781, longitude: 90.4007 },
  { code: "FARMGATE", name: "Farmgate", latitude: 23.7577, longitude: 90.3897 },
  { code: "DHANMONDI", name: "Dhanmondi", latitude: 23.7461, longitude: 90.3742 },
  { code: "MIRPUR", name: "Mirpur 10", latitude: 23.8069, longitude: 90.3687 },
  { code: "UTTARA", name: "Uttara", latitude: 23.8759, longitude: 90.3795 },
  { code: "BASHUNDHARA", name: "Bashundhara", latitude: 23.8193, longitude: 90.4526 },
  { code: "MOTIJHEEL", name: "Motijheel", latitude: 23.733, longitude: 90.4172 },
] as const;
export type AreaCode = (typeof AREAS)[number]["code"];
