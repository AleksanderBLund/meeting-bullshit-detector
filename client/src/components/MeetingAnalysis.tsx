import type { MeetingAnalysis } from '../../../shared/types';
import { BullshitMeter } from './BullshitMeter';
import { CostBreakdown } from './CostBreakdown';
import { ParticipantRanking } from './ParticipantRanking';
import { ActionPoints } from './ActionPoints';
import { AgendaView } from './AgendaView';

interface Props {
  analysis: MeetingAnalysis;
}

export function MeetingAnalysisView({ analysis }: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white">{analysis.subject}</h2>
        <p className="text-gray-400 mt-1">
          {new Date(analysis.date).toLocaleDateString('nb-NO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })} • {analysis.duration} minutter • {analysis.participantCount} deltakere
        </p>
        <p className="mt-4 text-gray-300 italic">"{analysis.summary}"</p>
      </div>

      {/* Score overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ScoreCard label="Totalt" value={analysis.scores.overall} />
        <ScoreCard label="BS-nivå" value={analysis.scores.bullshitLevel} inverted emoji="💩" />
        <ScoreCard label="Produktivitet" value={analysis.scores.productivity} emoji="⚡" />
        <ScoreCard label="Agenda" value={analysis.scores.agendaAdherence} emoji="📋" />
        <ScoreCard label="Handlingskraft" value={analysis.scores.actionability} emoji="🎯" />
      </div>

      {/* Main sections */}
      <div className="grid md:grid-cols-2 gap-6">
        <BullshitMeter
          level={analysis.scores.bullshitLevel}
          highlights={analysis.bullshitHighlights}
        />
        <CostBreakdown cost={analysis.cost} />
      </div>

      <ParticipantRanking participants={analysis.participants} />
      <ActionPoints actionPoints={analysis.actionPoints} />
      <AgendaView alignment={analysis.agendaAlignment} />
    </div>
  );
}

function ScoreCard({
  label,
  value,
  inverted,
  emoji,
}: {
  label: string;
  value: number;
  inverted?: boolean;
  emoji?: string;
}) {
  const getColor = () => {
    if (inverted) {
      if (value > 70) return 'from-red-500/20 to-red-500/5 border-red-500/30';
      if (value > 40) return 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
      return 'from-green-500/20 to-green-500/5 border-green-500/30';
    }
    if (value > 70) return 'from-green-500/20 to-green-500/5 border-green-500/30';
    if (value > 40) return 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
    return 'from-red-500/20 to-red-500/5 border-red-500/30';
  };

  const getTextColor = () => {
    if (inverted) {
      if (value > 70) return 'text-red-400';
      if (value > 40) return 'text-yellow-400';
      return 'text-green-400';
    }
    if (value > 70) return 'text-green-400';
    if (value > 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-gradient-to-b ${getColor()} border rounded-xl p-4 text-center`}>
      {emoji && <span className="text-2xl">{emoji}</span>}
      <div className={`text-3xl font-bold ${getTextColor()}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
