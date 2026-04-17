function getOutcome(score: { home: number; away: number }): "home" | "away" | "draw" {
  if (score.home > score.away) return "home";
  if (score.home < score.away) return "away";
  return "draw";
}

export function calcPoints(
  pred: { home: number; away: number },
  actual: { home: number; away: number }
): number {
  if (pred.home === actual.home && pred.away === actual.away) return 3;
  if (getOutcome(pred) === getOutcome(actual)) return 1;
  return 0;
}
