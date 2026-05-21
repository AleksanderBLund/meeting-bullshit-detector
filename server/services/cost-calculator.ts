import type { CostBreakdown } from '../../shared/types.js';

export function calculateCost(
  durationMinutes: number,
  participantCount: number,
  hourlyRate: number
): CostBreakdown {
  const totalCost = (durationMinutes / 60) * participantCount * hourlyRate;
  const costPerMinute = totalCost / durationMinutes;

  let verdict: CostBreakdown['verdict'];
  const costPerPerson = totalCost / participantCount;

  if (costPerPerson < 500) verdict = 'excellent';
  else if (costPerPerson < 1500) verdict = 'acceptable';
  else if (costPerPerson < 3000) verdict = 'expensive';
  else verdict = 'wasteful';

  return {
    totalCost: Math.round(totalCost),
    costPerMinute: Math.round(costPerMinute),
    costPerActionPoint: 0, // calculated later with action points
    hourlyRate,
    participantCount,
    durationMinutes,
    verdict,
  };
}
