import { formatTaka } from "@/lib/format.ts";

type Props = {
  distanceM: number;
  soloFarePaisa: number;
  pooledFarePaisa: number;
};

export function FareCard({ soloFarePaisa, pooledFarePaisa }: Props) {
  const savings = soloFarePaisa - pooledFarePaisa;
  return (
    <div className="rounded-xl border bg-muted/50 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Estimated fare
      </p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Solo</p>
          <p className="text-lg font-semibold">{formatTaka(soloFarePaisa)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-primary">Pooled (save {formatTaka(savings)})</p>
          <p className="text-2xl font-bold text-primary">{formatTaka(pooledFarePaisa)}</p>
        </div>
      </div>
      <p className="mt-3 border-t pt-2 text-[11px] leading-relaxed text-muted-foreground">
        base ৳40 + distance × ৳20/km, minus 25% when you share the ride.
      </p>
    </div>
  );
}
