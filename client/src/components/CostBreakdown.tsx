import type { CostBreakdown as CostBreakdownType } from '../../../shared/types';

interface Props {
  cost: CostBreakdownType;
}

export function CostBreakdown({ cost }: Props) {
  const verdictConfig: Record<string, { emoji: string; color: string; label: string }> = {
    excellent: { emoji: '🎉', color: 'text-green-400', label: 'Verdt pengene' },
    acceptable: { emoji: '👍', color: 'text-blue-400', label: 'OK kostnad' },
    expensive: { emoji: '💸', color: 'text-yellow-400', label: 'Dyrt møte' },
    wasteful: { emoji: '🔥', color: 'text-red-400', label: 'Penger i dass' },
  };

  const config = verdictConfig[cost.verdict] || verdictConfig.acceptable;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        💰 Kostnadsanalyse
      </h3>

      <div className="text-center mb-6">
        <span className="text-4xl">{config.emoji}</span>
        <div className={`text-4xl font-bold ${config.color} mt-2`}>
          {cost.totalCost.toLocaleString('nb-NO')} kr
        </div>
        <div className={`text-sm ${config.color}`}>{config.label}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Deltakere" value={`${cost.participantCount} pers`} />
        <Stat label="Varighet" value={`${cost.durationMinutes} min`} />
        <Stat label="Kr/minutt" value={`${cost.costPerMinute} kr`} />
        <Stat
          label="Kr/action point"
          value={
            cost.costPerActionPoint === cost.totalCost
              ? '∞ (ingen APs!)'
              : `${Math.round(cost.costPerActionPoint).toLocaleString('nb-NO')} kr`
          }
        />
        <Stat label="Timerate" value={`${cost.hourlyRate} kr/t`} />
        <Stat
          label="Alternativkost"
          value={`${(cost.totalCost / cost.hourlyRate).toFixed(1)} arbeidstimer`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-sm font-medium text-white mt-0.5">{value}</div>
    </div>
  );
}
