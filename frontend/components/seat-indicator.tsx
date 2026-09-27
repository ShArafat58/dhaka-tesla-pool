import { User } from "lucide-react";

export function SeatIndicator({ taken, capacity }: { taken: number; capacity: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: capacity }).map((_, i) => (
        <div
          key={i}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
            i < taken
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-muted text-muted-foreground/40"
          }`}
          title={i < taken ? "Occupied" : "Free"}
        >
          <User className="h-4 w-4" />
        </div>
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {taken}/{capacity} seats
      </span>
    </div>
  );
}
