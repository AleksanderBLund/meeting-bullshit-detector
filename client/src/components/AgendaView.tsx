import type { AgendaAlignment } from '../../../shared/types';

interface Props {
  alignment: AgendaAlignment;
}

export function AgendaView({ alignment }: Props) {
  if (!alignment.hasAgenda) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📋 Agenda-analyse</h3>
        <div className="text-center py-6">
          <span className="text-4xl">🚩</span>
          <p className="text-gray-400 mt-2">
            Ingen agenda funnet. Et møte uten agenda er som en reise uten kart — 
            du ender opp et tilfeldig sted og kaller det "produktivt".
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">📋 Agenda-analyse</h3>

      {/* Coverage stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{alignment.coveragePercent}%</div>
          <div className="text-xs text-gray-400">Dekket</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{alignment.offtopicPercent}%</div>
          <div className="text-xs text-gray-400">Off-topic</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {alignment.agendaItems.filter((a) => !a.covered).length}
          </div>
          <div className="text-xs text-gray-400">Skippet</div>
        </div>
      </div>

      {/* Agenda items */}
      <div className="space-y-2">
        {alignment.agendaItems.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-lg p-3 ${
              item.covered
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}
          >
            <span className="text-lg">{item.covered ? '✅' : '❌'}</span>
            <span className="flex-1 text-sm text-gray-200">{item.topic}</span>
            <span className="text-xs text-gray-400">{item.timeSpentPercent}% av tiden</span>
          </div>
        ))}
      </div>

      {/* Missing topics */}
      {alignment.missingTopics.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Burde vært diskutert:
          </h4>
          <div className="flex flex-wrap gap-2">
            {alignment.missingTopics.map((topic, i) => (
              <span
                key={i}
                className="text-xs bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-gray-300"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
