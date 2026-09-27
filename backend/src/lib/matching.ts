const MAX_BEARING_DIFFERENCE_DEG = 60;

// Shortest angular gap between two compass bearings (0-180).
export function bearingDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// A request may join a pool only if its direction is within the window of
// every passenger already in the pool. See docs/domain-rules.md section 3.
export function isDirectionCompatible(candidateBearing: number, poolBearings: number[]): boolean {
  return poolBearings.every(
    (b) => bearingDifference(candidateBearing, b) <= MAX_BEARING_DIFFERENCE_DEG,
  );
}

export { MAX_BEARING_DIFFERENCE_DEG };
