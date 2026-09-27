"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";

export function SeatIndicator({ taken, capacity }: { taken: number; capacity: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: capacity }).map((_, i) => {
        const occupied = i < taken;
        return (
          <motion.div
            key={i}
            initial={false}
            animate={{ scale: occupied ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.3 }}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              occupied
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-muted text-muted-foreground/40"
            }`}
            title={occupied ? "Occupied" : "Free"}
          >
            <User className="h-4 w-4" />
          </motion.div>
        );
      })}
      <span className="ml-1 text-xs text-muted-foreground">
        {taken}/{capacity} seats
      </span>
    </div>
  );
}
