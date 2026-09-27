import type { PaymentMethod, RideStatus } from "@dtp/shared";

export type Ride = {
  id: string;
  passengerId: string;
  poolId: string | null;
  pickupArea: string;
  dropoffArea: string;
  seats: number;
  roadDistanceM: number;
  bearingDeg: number;
  soloFarePaisa: number;
  finalFarePaisa: number | null;
  status: RideStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
};

export type JoinablePool = {
  id: string;
  pickupArea: string;
  capacity: number;
  seatsTaken: number;
  status: string;
};

export type Estimate = {
  roadDistanceM: number;
  soloFarePaisa: number;
  pooledFarePaisa: number;
};
