import { Check } from "lucide-react";
import type { RideStatus } from "@dtp/shared";

const STEPS: { status: RideStatus; label: string }[] = [
  { status: "REQUESTED", label: "Requested" },
  { status: "MATCHED", label: "Matched" },
  { status: "DRIVER_ARRIVED", label: "Driver arrived" },
  { status: "STARTED", label: "In progress" },
  { status: "COMPLETED", label: "Completed" },
];

export function StatusTimeline({ status }: { status: RideStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
        This ride was cancelled.
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="flex items-center">
      {STEPS.map((step, i) => {
        const isCompleted = status === "COMPLETED";
        const done = i < currentIndex || isCompleted;
        const active = i === currentIndex && !isCompleted;
        return (
          <li key={step.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-muted text-muted-foreground/50"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`mt-1 max-w-16 text-center text-[10px] leading-tight ${
                  active ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
