# Concurrency: the last-seat problem

Bullet has one seat left. Nusrat and Shirin both tap "Join" at nearly the same instant, and both
initially see one seat free. Exactly one must win.

## How we handle it now

Joining a pool runs inside a single database transaction with three layers of protection.

### Layer 1: a row lock (`SELECT ... FOR UPDATE`)

BEGIN;
SELECT * FROM pools WHERE id = :poolId FOR UPDATE; -- locks the pool row

The first transaction to reach this line locks the pool row. The second transaction blocks on the
same line until the first commits. This serialises the two joins: they can no longer both read
"one seat free" at the same time.

### Layer 2: an application check under the lock

After acquiring the lock, we re-read `seats_taken` (now up to date) and check
`seats_taken + requestedSeats <= capacity`. The loser sees the seat already taken and is rejected
with `NO_SEATS`.

### Layer 3: a database CHECK constraint

```sql
CONSTRAINT pools_seats_within_capacity CHECK (seats_taken <= capacity)
```

Even if the application logic had a bug, this constraint makes an over-capacity write impossible.
It is the final backstop, independent of the application.

## Why a real test, not a mock

`pool-service.test.ts` fires two `joinPool` calls with `Promise.allSettled` against a real
Postgres. It asserts exactly one succeeds, one fails, and `seats_taken` never exceeds `capacity`.
The test repeats the race five times so the result is a guarantee, not luck. A mocked database
could not prove any of this, because the guarantee lives in Postgres, not in our code.

## What changes at scale

- **Single database, many app instances:** row locks still work, because the lock lives in
  Postgres, not in a single Node process. This design already survives horizontal scaling of the
  API.
- **Lock contention on popular pools:** a very hot pool would serialise many joiners on one row.
  We would move to an atomic conditional update
  (`UPDATE pools SET seats_taken = seats_taken + :n WHERE id = :id AND seats_taken + :n <= capacity`)
  and treat "0 rows updated" as "no seats", avoiding an explicit lock hold.
- **Multiple regions:** a single primary still owns writes; cross-region we would route seat
  claims to the primary and accept the added latency, because correctness beats speed for money
  and seats.
- **Idempotency:** at scale we would add an idempotency key per join request so a client retry
  after a timeout cannot double-book.
