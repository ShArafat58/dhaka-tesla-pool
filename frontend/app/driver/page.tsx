"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/app-header.tsx";
import { RouteGuard } from "@/components/route-guard.tsx";
import { SeatIndicator } from "@/components/seat-indicator.tsx";
import { api, ApiRequestError } from "@/lib/api.ts";
import { formatArea, formatKm, formatTaka, humanizeStatus } from "@/lib/format.ts";
import type { ActivePool, Ride, Vehicle } from "@/lib/types.ts";

function DriverInner() {
  const queryClient = useQueryClient();

  const vehicleQuery = useQuery({
    queryKey: ["vehicle"],
    queryFn: () => api<{ vehicle: Vehicle }>("/driver/vehicle").then((r) => r.vehicle),
    refetchInterval: 4000,
  });

  const requestsQuery = useQuery({
    queryKey: ["open-requests"],
    queryFn: () => api<{ requests: Ride[] }>("/driver/requests").then((r) => r.requests),
    refetchInterval: 4000,
  });

  const poolQuery = useQuery({
    queryKey: ["active-pool"],
    queryFn: () => api<{ pool: ActivePool | null }>("/driver/pool").then((r) => r.pool),
    refetchInterval: 4000,
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["vehicle"] });
    void queryClient.invalidateQueries({ queryKey: ["open-requests"] });
    void queryClient.invalidateQueries({ queryKey: ["active-pool"] });
  }

  const onlineMutation = useMutation({
    mutationFn: (isOnline: boolean) =>
      api("/driver/online", { method: "PATCH", body: JSON.stringify({ isOnline }) }),
    onSuccess: refresh,
  });

  const acceptMutation = useMutation({
    mutationFn: (rideId: string) => api(`/driver/rides/${rideId}/accept`, { method: "POST" }),
    onSuccess: refresh,
  });

  const advanceMutation = useMutation({
    mutationFn: (vars: { poolId: string; action: "arrive" | "start" | "complete" }) =>
      api(`/driver/pools/${vars.poolId}/${vars.action}`, { method: "POST" }),
    onSuccess: refresh,
  });

  const vehicle = vehicleQuery.data;
  const pool = poolQuery.data;
  const requests = requestsQuery.data ?? [];

  const nextAction: Record<string, { action: "arrive" | "start" | "complete"; label: string }> = {
    ACCEPTED: { action: "arrive", label: "Mark arrived" },
    ARRIVED: { action: "start", label: "Start trip" },
    IN_PROGRESS: { action: "complete", label: "Complete trip" },
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Vehicle / online toggle */}
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{vehicle?.name ?? "Your Tesla"}</h2>
              <p className="text-sm text-muted-foreground">
                Capacity {vehicle?.capacity ?? "-"} seats ·{" "}
                {vehicle?.isOnline ? (
                  <span className="text-primary">Online</span>
                ) : (
                  <span>Offline</span>
                )}
              </p>
            </div>
            {vehicle && (
              <button
                onClick={() => onlineMutation.mutate(!vehicle.isOnline)}
                disabled={onlineMutation.isPending}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  vehicle.isOnline
                    ? "border border-danger/40 text-danger hover:bg-danger/10"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {vehicle.isOnline ? "Go offline" : "Go online"}
              </button>
            )}
          </div>
        </section>

        {/* Active pool */}
        {pool && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Current pool</h2>
                <p className="text-sm text-muted-foreground">
                  From {formatArea(pool.pool.pickupArea)} · {humanizeStatus(pool.pool.status)}
                </p>
              </div>
              <SeatIndicator taken={pool.pool.seatsTaken} capacity={pool.pool.capacity} />
            </div>

            <div className="space-y-2">
              {pool.passengers.map((p) => (
                <div key={p.id} className="rounded-lg border bg-muted/50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {formatArea(p.pickupArea)} → {formatArea(p.dropoffArea)}
                    </span>
                    <span className="text-primary font-semibold">
                      {formatTaka(p.finalFarePaisa ?? p.soloFarePaisa)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.seats} seat{p.seats > 1 ? "s" : ""} · {formatKm(p.roadDistanceM)} ·{" "}
                    {humanizeStatus(p.status)}
                  </p>
                </div>
              ))}
            </div>

            {nextAction[pool.pool.status] && (
              <button
                onClick={() =>
                  advanceMutation.mutate({
                    poolId: pool.pool.id,
                    action: nextAction[pool.pool.status]!.action,
                  })
                }
                disabled={advanceMutation.isPending}
                className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {nextAction[pool.pool.status]!.label}
              </button>
            )}
          </motion.section>
        )}

        {/* Open requests */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Ride requests</h2>

          {!vehicle?.isOnline && (
            <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
              Go online to see and accept ride requests.
            </div>
          )}

          {vehicle?.isOnline && requestsQuery.isLoading && (
            <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
              Looking for requests...
            </div>
          )}

          {vehicle?.isOnline && requests.length === 0 && !requestsQuery.isLoading && (
            <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
              No open requests right now.
            </div>
          )}

          {vehicle?.isOnline &&
            requests.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold">
                    {formatArea(r.pickupArea)} → {formatArea(r.dropoffArea)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.seats} seat{r.seats > 1 ? "s" : ""} · {formatKm(r.roadDistanceM)} ·{" "}
                    {r.paymentMethod === "CASH" ? "Cash" : "TeslaPay"}
                  </p>
                </div>
                <button
                  onClick={() => acceptMutation.mutate(r.id)}
                  disabled={acceptMutation.isPending || !!pool}
                  title={pool ? "Finish your current pool first" : undefined}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  Accept
                </button>
              </motion.div>
            ))}

          {acceptMutation.isError && (
            <p className="text-sm text-danger">
              {acceptMutation.error instanceof ApiRequestError
                ? acceptMutation.error.error.message
                : "Could not accept"}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export default function DriverPage() {
  return (
    <RouteGuard role="DRIVER">
      <DriverInner />
    </RouteGuard>
  );
}
