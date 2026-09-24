# Data model

Eight tables. `users` and `vehicles` are the actors, `areas` is fixed reference data, `pools`
group `ride_requests` that share a Tesla, `payments` records money, and `status_history` is the
audit trail for both machines.

## ERD

```mermaid
erDiagram
    users ||--o{ vehicles : "owns (driver)"
    users ||--o{ ride_requests : "requests (passenger)"
    users ||--o| wallets : "has"
    areas ||--o{ ride_requests : "pickup"
    areas ||--o{ ride_requests : "dropoff"
    vehicles ||--o{ pools : "runs"
    users ||--o{ pools : "drives"
    pools ||--o{ ride_requests : "carries"
    ride_requests ||--o| payments : "settles"
    ride_requests ||--o{ status_history : "logs"
    pools ||--o{ status_history : "logs"

    users {
        uuid id PK
        text name
        text email UK
        text password_hash
        text role "passenger | driver"
        timestamptz created_at
    }
    wallets {
        uuid id PK
        uuid user_id FK,UK
        integer balance_paisa "CHECK >= 0"
    }
    areas {
        text code PK "BANANI, GULSHAN_1, ..."
        text name
        double latitude
        double longitude
    }
    vehicles {
        uuid id PK
        uuid driver_id FK,UK
        text name "Bullet"
        integer capacity "CHECK > 0"
        boolean is_online
    }
    pools {
        uuid id PK
        uuid vehicle_id FK
        uuid driver_id FK
        text pickup_area FK
        text status "FORMING | ACCEPTED | ..."
        integer seats_taken "CHECK 0..capacity"
        timestamptz created_at
    }
    ride_requests {
        uuid id PK
        uuid passenger_id FK
        uuid pool_id FK "nullable"
        text pickup_area FK
        text dropoff_area FK
        integer seats "CHECK > 0"
        integer road_distance_m
        integer bearing_deg
        integer solo_fare_paisa
        integer final_fare_paisa "nullable"
        text status "REQUESTED | MATCHED | ..."
        text payment_method "CASH | TESLAPAY"
        timestamptz created_at
    }
    payments {
        uuid id PK
        uuid ride_request_id FK,UK
        integer amount_paisa
        text method "CASH | TESLAPAY"
        text status "PENDING | PAID"
        timestamptz created_at
    }
    status_history {
        uuid id PK
        text entity_type "RIDE_REQUEST | POOL"
        uuid entity_id
        text from_status "nullable"
        text to_status
        uuid changed_by FK
        text reason
        timestamptz created_at
    }
```

## Tables

### `users`

Both passengers and drivers. `role` separates them. `email` is `UNIQUE`; `password_hash` stores a
bcrypt hash, never a plain password.

### `wallets`

One row per user for the simulated TeslaPay balance. `balance_paisa` has `CHECK (>= 0)` so a
deduction can never drive it negative, even under a race. `user_id` is `UNIQUE` (one wallet each).

### `areas`

Fixed reference data seeded from the area list in [domain rules](./domain-rules.md). `code` is the
primary key so ride requests store a stable code, not a coordinate that might drift.

### `vehicles`

One Tesla per driver (`driver_id` is `UNIQUE`). `capacity` is fixed per vehicle with `CHECK (> 0)`
(Bullet = 3). `is_online` drives whether the driver sees requests.

### `pools`

One Tesla trip. `seats_taken` is kept in sync as passengers join and leave, guarded by
`CHECK (seats_taken >= 0 AND seats_taken <= capacity of the vehicle)` — enforced with a trigger or
an application-level check plus the ride-request seat sum. This is the last line of defence for the
concurrency problem: even if two requests race, the row lock plus this check let only one win.

### `ride_requests`

The heart of the model. Stores the passenger's own trip, the frozen distance and bearing (so the
fare is reproducible), both fares (`solo_fare_paisa` always, `final_fare_paisa` once the trip
starts), and its own status. `pool_id` is nullable because a request exists briefly before it
joins a pool.

### `payments`

One row per ride request (`ride_request_id` is `UNIQUE`). Records the amount actually charged and
whether it is `PENDING` or `PAID`. Kept separate from `ride_requests` so payment can be extended
(refunds, retries) without touching the ride.

### `status_history`

Append-only audit log for **both** machines (`entity_type` = `RIDE_REQUEST` or `POOL`). Every
transition writes one row: `from_status`, `to_status`, `changed_by`, `reason`, `created_at`. This
is how any ride can be explained later.

## Indexes

| Index                                    | Why                                     |
| ---------------------------------------- | --------------------------------------- |
| `users(email)` UNIQUE                    | Login lookup and duplicate-signup guard |
| `vehicles(driver_id)` UNIQUE             | One Tesla per driver                    |
| `wallets(user_id)` UNIQUE                | One wallet per user                     |
| `ride_requests(passenger_id)`            | "My rides" history query                |
| `ride_requests(pool_id)`                 | List all passengers in a pool           |
| `ride_requests(status)`                  | Find open `REQUESTED` requests to match |
| `pools(driver_id, status)`               | Driver's active pool lookup             |
| `status_history(entity_type, entity_id)` | Replay one entity's history in order    |
| `payments(ride_request_id)` UNIQUE       | One payment per ride                    |

## Types

- Identifiers: `uuid` (generated by the database), so ids are not guessable sequential integers.
- Money: `integer` paisa with `CHECK (>= 0)` where a balance is involved.
- Enums (`role`, `status`, `payment_method`): stored as `text` with a `CHECK` list rather than a
  Postgres `ENUM` type, so adding a value is a plain migration, not an `ALTER TYPE`.
- Timestamps: `timestamptz` (UTC), formatted to Dhaka time only in the UI.
