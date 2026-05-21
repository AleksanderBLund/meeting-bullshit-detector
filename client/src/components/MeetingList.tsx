import type { MeetingAnalysis } from '../../../shared/types';

interface Props {
  analyses: MeetingAnalysis[];
  loading: boolean;
  onSelect: (analysis: MeetingAnalysis) => void;
}

export function MeetingList({ analyses, loading, onSelect }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-20">
        <span className="text-6xl mb-4 block">🎯</span>
        <h2 className="text-2xl font-bold text-white mb-2">No meetings analyzed yet</h2>
        <p className="text-gray-400">
          Upload a transcript or connect Teams to start detecting bullshit
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white mb-4">Recent Analyses</h2>
      {analyses.map((analysis) => (
        <button
          key={analysis.id}
          onClick={() => onSelect(analysis)}
          className="w-full text-left bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-purple-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white group-hover:text-purple-300 transition-colors">
                {analysis.subject}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {new Date(analysis.date).toLocaleDateString('nb-NO')} •{' '}
                {analysis.duration} min • {analysis.participantCount} deltakere
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ScoreBadge label="BS" value={analysis.scores.bullshitLevel} inverted />
              <ScoreBadge label="Produktivitet" value={analysis.scores.productivity} />
              <CostBadge cost={analysis.cost.totalCost} verdict={analysis.cost.verdict} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ScoreBadge({ label, value, inverted }: { label: string; value: number; inverted?: boolean }) {
  const color = inverted
    ? value > 70 ? 'text-red-400' : value > 40 ? 'text-yellow-400' : 'text-green-400'
    : value > 70 ? 'text-green-400' : value > 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color}`}>{value}%</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function CostBadge({ cost, verdict }: { cost: number; verdict: string }) {
  const colors: Record<string, string> = {
    excellent: 'text-green-400',
    acceptable: 'text-blue-400',
    expensive: 'text-yellow-400',
    wasteful: 'text-red-400',
  };

  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${colors[verdict] || 'text-gray-400'}`}>
        {cost.toLocaleString('nb-NO')} kr
      </div>
      <div className="text-xs text-gray-500">Kostnad</div>
    </div>
  );
}
