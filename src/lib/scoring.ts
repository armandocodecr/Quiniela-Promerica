export function calcPoints(
  pred: { home: number; away: number },
  actual: { home: number; away: number }
): number {
  if (pred.home === actual.home && pred.away === actual.away) return 3;
  if (pred.home === pred.away && actual.home === actual.away) return 1;
  return 0;
}
