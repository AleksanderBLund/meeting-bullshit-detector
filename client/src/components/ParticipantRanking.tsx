import type { ParticipantAnalysis } from '../../../shared/types';

interface Props {
  participants: ParticipantAnalysis[];
}

export function ParticipantRanking({ participants }: Props) {
  const sorted = [...participants].sort((a, b) => b.contributionScore - a.contributionScore);

  const verdictConfig: Record<string, { emoji: string; color: string; label: string }> = {
    essential: { emoji: '⭐', color: 'text-green-400', label: 'Essensiell' },
    useful: { emoji: '👍', color: 'text-blue-400', label: 'Nyttig' },
    passive: { emoji: '😴', color: 'text-yellow-400', label: 'Passiv' },
    unnecessary: { emoji: '🚪', color: 'text-red-400', label: 'Unødvendig' },
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        👥 Deltaker-ranking
      </h3>

      <div className="space-y-3">
        {sorted.map((p, i) => {
          const config = verdictConfig[p.verdict] || verdictConfig.useful;
          return (
            <div
              key={i}
              className="flex items-center gap-4 bg-gray-800/50 rounded-lg p-3"
            >
              <div className="text-2xl w-8 text-center">{config.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">
                    {p.participant.displayName}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-700 ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span>Taletid: {p.speakingTimePercent}%</span>
                  <span>Bidrag: {p.contributionScore}/100</span>
                  <span>BS: {p.bullshitScore}/100</span>
                  <span>APs: {p.actionPointsGenerated}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-300">
                  Relevans
                </div>
                <div className={`text-lg font-bold ${
                  p.relevanceScore > 70 ? 'text-green-400' :
                  p.relevanceScore > 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {p.relevanceScore}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
