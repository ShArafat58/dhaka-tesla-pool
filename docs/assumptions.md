# Assumptions

The brief leaves some things open on purpose. These are the decisions we made, why we made them,
and what we would revisit. Each one is applied consistently across the schema, API, tests and UI.

## Domain

1. **Areas are fixed reference data, not free text.** Pickup and drop-off must be one of the
   seeded Dhaka areas. This keeps distance and matching deterministic and testable without a map
   API. To add a neighbourhood, add a seed row.

2. **One representative coordinate per area.** Each area is a single lat/long point, not a polygon.
   Good enough for a distance estimate; a real system would use zones.

3. **Road distance = straight-line × 1.3.** A fixed factor stands in for real routing. It is
   applied identically to every trip, so fares stay comparable and hand-checkable.

4. **Matching is direction-based (60° window), same pickup area.** A simple, explainable proxy for
   route overlap. We do not model real road paths.

5. **A driver owns exactly one Tesla, with a fixed capacity.** Bullet has 3 seats. The model
   allows other capacities but assumes one vehicle per driver.

6. **A passenger books whole seats (≥ 1).** No fractional seats. A passenger may book more than one
   seat (for companions), limited by remaining capacity.

## Fare and money

7. **Fare is finalised at trip start, not at request time.** Before that the passenger sees solo
   and pooled estimates. The pooled price only applies if the pool actually has ≥ 2 passengers when
   the trip starts.

8. **Every passenger pays only for their own trip.** Pooling gives each a discount; it never makes
   one passenger subsidise another's distance.

9. **The pool discount is a flat 25% when pooled.** Chosen to be easy to verify by hand. A real
   system might scale it with detour cost.

10. **Money is integer paisa everywhere except display.** See
    [domain rules §5](./domain-rules.md#5-money-is-stored-as-integer-paisa).

11. **TeslaPay requires enough balance at request time** (at least the solo estimate). The wallet
    can never go negative (DB `CHECK`). Cash has no pre-check.

## Lifecycle and authorization

12. **Ride requests and pools are separate state machines.** One passenger cancelling does not end
    the trip for others. See [lifecycle](./lifecycle.md).

13. **A passenger may cancel only before the trip starts** (`STARTED`). After that the ride must
    complete.

14. **A user sees and modifies only their own data.** A passenger cannot read or change another
    passenger's ride; a driver acts only on pools they own. Enforced in the service layer and
    checked by a test.

15. **New passengers may join a pool only while it is `ACCEPTED`.** Once the driver marks arrived,
    the seat count is frozen.

## Auth and sessions

16. **Roles are fixed at signup** (`passenger` or `driver`). No user is both. No admin role in the
    MVP.

17. **Auth is a JWT in an httpOnly cookie.** No email verification, password reset or refresh
    tokens in the MVP; these are listed as next steps.

## Operational

18. **Live updates use polling, not WebSockets.** The frontend re-fetches status every few seconds.
    A few seconds of delay is acceptable for ride status.

19. **One region, one currency, one language of data.** Times are stored in UTC and shown in Dhaka
    time; money is Bangladeshi taka.

20. **Seed data uses the story cast** — Jashim (driver, owns Bullet), Nusrat, Rafiq and Shirin
    (passengers) — across seed, tests, and demo, never `user1`/`driver1`.
