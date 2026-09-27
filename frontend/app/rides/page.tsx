"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { AREAS, PAYMENT_METHODS } from "@dtp/shared";
import { AppHeader } from "@/components/app-header.tsx";
import { FareCard } from "@/components/fare-card.tsx";
import { RouteGuard } from "@/components/route-guard.tsx";
import { SeatIndicator } from "@/components/seat-indicator.tsx";
import { StatusTimeline } from "@/components/status-timeline.tsx";
import { api, ApiRequestError } from "@/lib/api.ts";
import { formatArea, formatKm, formatTaka, humanizeStatus } from "@/lib/format.ts";
import type { Estimate, JoinablePool, Ride } from "@/lib/types.ts";

function RidesInner() {
  const queryClient = useQueryClient();
  const [pickupArea, setPickupArea] = useState("BANANI");
  const [dropoffArea, setDropoffArea] = useState("MOHAKHALI");
  const [seats, setSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // My rides, polled every 4s so status updates from the driver appear live.
  const ridesQuery = useQuery({
    queryKey: ["rides"],
    queryFn: () => api<{ rides: Ride[] }>("/rides").then((r) => r.rides),
    refetchInterval: 4000,
  });

  const estimateMutation = useMutation({
    mutationFn: () =>
      api<Estimate>("/rides/estimate", {
        method: "POST",
        body: JSON.stringify({ pickupArea, dropoffArea, seats }),
      }),
    onSuccess: (data) => {
      setEstimate(data);
      setFormError(null);
    },
    onError: (err) =>
      setFormError(err instanceof ApiRequestError ? err.error.message : "Could not estimate"),
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      api<{ ride: Ride }>("/rides", {
        method: "POST",
        body: JSON.stringify({ pickupArea, dropoffArea, seats, paymentMethod }),
      }),
    onSuccess: () => {
      setEstimate(null);
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
    },
    onError: (err) =>
      setFormError(err instanceof ApiRequestError ? err.error.message : "Could not request"),
  });

  const cancelMutation = useMutation({
    mutationFn: (rideId: string) => api(`/rides/${rideId}/cancel`, { method: "POST" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["rides"] }),
  });

  const joinMutation = useMutation({
    mutationFn: (vars: { poolId: string; rideId: string }) =>
      api("/rides/join", { method: "POST", body: JSON.stringify(vars) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["rides"] }),
  });

  const sameArea = pickupArea === dropoffArea;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Request form */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-5 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-bold">Request a ride</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Pickup</span>
              <select
                value={pickupArea}
                onChange={(e) => setPickupArea(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              >
                {AREAS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Destination</span>
              <select
                value={dropoffArea}
                onChange={(e) => setDropoffArea(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              >
                {AREAS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Seats</span>
              <select
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Payment</span>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])
                }
                className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m === "CASH" ? "Cash" : "TeslaPay"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {sameArea && (
            <p className="mt-3 text-sm text-danger">Pickup and destination must differ.</p>
          )}
          {formError && <p className="mt-3 text-sm text-danger">{formError}</p>}

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => estimateMutation.mutate()}
              disabled={sameArea || estimateMutation.isPending}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-primary disabled:opacity-50"
            >
              {estimateMutation.isPending ? "Estimating..." : "See fare"}
            </button>
            <button
              onClick={() => requestMutation.mutate()}
              disabled={sameArea || requestMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {requestMutation.isPending ? "Requesting..." : "Request ride"}
            </button>
          </div>

          {estimate && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">
                {formatArea(pickupArea)} → {formatArea(dropoffArea)} ·{" "}
                {formatKm(estimate.roadDistanceM)}
              </p>
              <FareCard
                distanceM={estimate.roadDistanceM}
                soloFarePaisa={estimate.soloFarePaisa}
                pooledFarePaisa={estimate.pooledFarePaisa}
              />
            </div>
          )}
        </motion.section>

        {/* My rides */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">My rides</h2>

          {ridesQuery.isLoading && (
            <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
              Loading your rides...
            </div>
          )}

          {ridesQuery.isError && (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              Could not load your rides. Please refresh.
            </div>
          )}

          {ridesQuery.data?.length === 0 && (
            <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
              No rides yet. Request one above to get moving.
            </div>
          )}

          {ridesQuery.data?.map((ride) => {
            const canCancel = ["REQUESTED", "MATCHED", "DRIVER_ARRIVED"].includes(ride.status);
            const fare = ride.finalFarePaisa ?? ride.soloFarePaisa;
            return (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">
                      {formatArea(ride.pickupArea)} → {formatArea(ride.dropoffArea)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ride.seats} seat{ride.seats > 1 ? "s" : ""} · {formatKm(ride.roadDistanceM)}{" "}
                      · {ride.paymentMethod === "CASH" ? "Cash" : "TeslaPay"}
                      {ride.poolId && " · pooled"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{formatTaka(fare)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ride.finalFarePaisa ? "final" : "estimate"}
                    </p>
                  </div>
                </div>

                <StatusTimeline status={ride.status} />

                {ride.status === "REQUESTED" && <JoinablePools ride={ride} onJoin={joinMutation} />}

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {humanizeStatus(ride.status)}
                  </span>
                  {canCancel && (
                    <button
                      onClick={() => cancelMutation.mutate(ride.id)}
                      disabled={cancelMutation.isPending}
                      className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function JoinablePools({
  ride,
  onJoin,
}: {
  ride: Ride;
  onJoin: ReturnType<typeof useMutation<unknown, Error, { poolId: string; rideId: string }>>;
}) {
  const poolsQuery = useQuery({
    queryKey: ["joinable", ride.id],
    queryFn: () => api<{ pools: JoinablePool[] }>(`/rides/${ride.id}/pools`).then((r) => r.pools),
    refetchInterval: 4000,
  });

  const pools = poolsQuery.data ?? [];
  if (pools.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-3">
      <p className="mb-2 text-xs font-semibold text-accent-foreground">
        A Tesla heading your way has room! Join to share and save.
      </p>
      <div className="space-y-2">
        {pools.map((pool) => (
          <div
            key={pool.id}
            className="flex items-center justify-between rounded-lg border bg-card p-3"
          >
            <SeatIndicator taken={pool.seatsTaken} capacity={pool.capacity} />
            <button
              onClick={() => onJoin.mutate({ poolId: pool.id, rideId: ride.id })}
              disabled={onJoin.isPending}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {onJoin.isPending ? "Joining..." : "Join pool"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RidesPage() {
  return (
    <RouteGuard role="PASSENGER">
      <RidesInner />
    </RouteGuard>
  );
}
