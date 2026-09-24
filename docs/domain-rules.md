# Domain rules

This document defines the three rules the whole product depends on: where people can go, which
requests may share a Tesla, and how much each passenger pays. Every number here can be checked
by hand.

## 1. Dhaka areas

We do not use a map API. Pickup and drop-off are chosen from a fixed list of areas, each with one
representative coordinate. The list is seed data in the `areas` table.

| Code          | Area        | Latitude | Longitude | Road distance from Banani | Bearing from Banani |
| ------------- | ----------- | -------: | --------: | ------------------------: | ------------------: |
| `BANANI`      | Banani      |  23.7940 |   90.4043 |                         — |                   — |
| `GULSHAN_1`   | Gulshan 1   |  23.7806 |   90.4166 |                    2.5 km |              140.0° |
| `GULSHAN_2`   | Gulshan 2   |  23.7949 |   90.4143 |                    1.3 km |               84.4° |
| `MOHAKHALI`   | Mohakhali   |  23.7781 |   90.4007 |                    2.3 km |              191.7° |
| `FARMGATE`    | Farmgate    |  23.7577 |   90.3897 |                    5.6 km |              200.2° |
| `DHANMONDI`   | Dhanmondi   |  23.7461 |   90.3742 |                    8.0 km |              209.9° |
| `MIRPUR`      | Mirpur 10   |  23.8069 |   90.3687 |                    5.1 km |              291.6° |
| `UTTARA`      | Uttara      |  23.8759 |   90.3795 |                   12.3 km |              344.5° |
| `BASHUNDHARA` | Bashundhara |  23.8193 |   90.4526 |                    7.4 km |               60.2° |
| `MOTIJHEEL`   | Motijheel   |  23.7330 |   90.4172 |                    9.0 km |              169.0° |

Bearing is the compass direction of the destination as seen from the pickup point
(0° = north, 90° = east, 180° = south, 270° = west).

## 2. Distance

```
straightLine = haversine(pickup, dropoff)          // metres, Earth radius 6,371 km
roadDistance = round(straightLine × 1.3 / 100) × 100 // metres, nearest 100 m
```

- Dhaka roads are not straight, so a fixed **road factor of 1.3** turns straight-line distance
  into an estimated road distance.
- Rounding to the nearest 100 m keeps fares in clean numbers and makes them easy to check.
- The distance is calculated once, when the request is created, and stored on the request so the
  fare never changes because of a later code change.

## 3. Matching rule (who may share a Tesla)

A ride request may join a pool only if **all** of these hold:

1. **Same pickup area** as the pool.
2. **Compatible direction**: the request's bearing is within **60°** of the bearing of **every**
   passenger already in the pool. The difference is measured the short way around the compass:
   `diff = min(|a − b|, 360 − |a − b|)`.
3. **Pool still open**: the pool is in `ACCEPTED` status (the driver has not arrived yet).
4. **Enough seats**: `seatsTaken + requestedSeats ≤ capacity`.

Why a direction rule: passengers heading roughly the same way cause only a small detour for each
other. The 60° window is a simple, explainable stand-in for real route overlap.

### Worked example: Nusrat and Rafiq

| Passenger | Trip               | Bearing |
| --------- | ------------------ | ------: |
| Nusrat    | Banani → Mohakhali |  191.7° |
| Rafiq     | Banani → Gulshan 1 |  140.0° |

- Same pickup area: both Banani ✅
- Direction: `|191.7 − 140.0| = 51.7° ≤ 60°` ✅
- Bullet has 3 seats and each books 1 seat, so seats are available ✅

**Result: Nusrat and Rafiq can share Bullet.**

Counter-examples:

- A rider to **Uttara** (344.5°) cannot join Nusrat: `min(152.8, 207.2) = 152.8° > 60°`.
- A rider to **Dhanmondi** (209.9°) can join a pool that only has Nusrat (`18.2°`), but not a
  pool that has Nusrat **and** Rafiq, because against Rafiq the difference is `69.9° > 60°`.

## 4. Fare model

```
distanceCharge = roadDistanceKm × PER_KM
subtotal       = (BASE_FARE + distanceCharge) × seats
poolDiscount   = floor(subtotal × POOL_DISCOUNT_PERCENT / 100)   // only if the pool has ≥ 2 passengers
passengerFare  = subtotal − poolDiscount
```

| Constant                | Value            |
| ----------------------- | ---------------- |
| `BASE_FARE`             | ৳40 (4000 paisa) |
| `PER_KM`                | ৳20 (2000 paisa) |
| `POOL_DISCOUNT_PERCENT` | 25               |

Rules:

- Every passenger pays for **their own** distance and seats, never for someone else's.
- When a request is created, the passenger sees two estimates: solo fare and pooled fare.
- The fare is **finalised when the trip starts**. If at that moment the pool has two or more
  passengers, the discount applies; if a partner cancelled before the start, it does not.
- The discount is rounded down to a whole paisa (`floor`), so every stored amount is an
  integer.

### Worked example: Nusrat and Rafiq, pooled in Bullet

All amounts in paisa (100 paisa = ৳1).

| Step                     | Nusrat (Banani → Mohakhali) | Rafiq (Banani → Gulshan 1) |
| ------------------------ | --------------------------: | -------------------------: |
| Road distance            |                      2.3 km |                     2.5 km |
| Distance charge (× 2000) |                        4600 |                       5000 |
| Base fare                |                        4000 |                       4000 |
| Subtotal (1 seat)        |                        8600 |                       9000 |
| Pool discount (25%)      |                        2150 |                       2250 |
| **Passenger fare**       |           **6450 (৳64.50)** |          **6750 (৳67.50)** |

Solo, they would have paid ৳86.00 and ৳90.00. Pooled, each saves 25%, and Jashim collects
৳132.00 for one trip.

## 5. Money is stored as integer paisa

All amounts are stored as integers in paisa (`integer` / `bigint` columns), never as floats or
decimals in application code.

- Floating point cannot represent values like 0.1 exactly, so repeated additions drift
  (`0.1 + 0.2 = 0.30000000000000004`).
- Integers are exact, fast to compare and sum, and map directly to a PostgreSQL `integer`.
- Formatting to taka (`6450 → ৳64.50`) happens only at the edge, in the UI.
- `NUMERIC` would also be exact, but it arrives in JavaScript as a string and needs a decimal
  library; integer paisa avoids that entire class of bugs.

## 6. Payment

Each request chooses **Cash** or **TeslaPay** (a simulated wallet).

- Cash: recorded as paid when the driver completes the trip.
- TeslaPay: at request time the wallet must hold at least the solo estimate (the highest possible
  fare). The final fare is deducted in the same transaction that completes the trip, and a CHECK
  constraint keeps the balance from ever going negative.
