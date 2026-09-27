// Fare model shared by the API (authoritative) and the web app (estimates).
// All money is integer paisa. See docs/domain-rules.md section 4.

export const BASE_FARE_PAISA = 4000;
export const PER_KM_PAISA = 2000;
export const POOL_DISCOUNT_PERCENT = 25;

export type FareBreakdown = {
  baseFarePaisa: number;
  distanceChargePaisa: number;
  subtotalPaisa: number;
  poolDiscountPaisa: number;
  farePaisa: number;
};

// Computes one passenger's fare. `pooled` applies the discount only when the
// passenger actually shares the ride with at least one other passenger.
export function computeFare(roadDistanceM: number, seats: number, pooled: boolean): FareBreakdown {
  const roadDistanceKm = roadDistanceM / 1000;
  const distanceChargePaisa = Math.round(roadDistanceKm * PER_KM_PAISA);
  const subtotalPaisa = (BASE_FARE_PAISA + distanceChargePaisa) * seats;
  const poolDiscountPaisa = pooled ? Math.floor((subtotalPaisa * POOL_DISCOUNT_PERCENT) / 100) : 0;

  return {
    baseFarePaisa: BASE_FARE_PAISA * seats,
    distanceChargePaisa: distanceChargePaisa * seats,
    subtotalPaisa,
    poolDiscountPaisa,
    farePaisa: subtotalPaisa - poolDiscountPaisa,
  };
}
