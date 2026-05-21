import type { ActionPoint } from '../../../shared/types';

interface Props {
  actionPoints: ActionPoint[];
}

export function ActionPoints({ actionPoints }: Props) {
  const priorityConfig: Record<string, { color: string; bg: string }> = {
    high: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    low: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  };

  if (actionPoints.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🎯 Action Points</h3>
        <div className="text-center py-8">
          <span className="text-4xl">🤷</span>
          <p className="text-gray-400 mt-2">
            Ingen konkrete action points funnet. Var dette møtet nødvendig?
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        🎯 Action Points ({actionPoints.length})
      </h3>

      <div className="space-y-2">
        {actionPoints.map((ap) => {
          const config = priorityConfig[ap.priority] || priorityConfig.medium;
          return (
            <div
              key={ap.id}
              className={`border rounded-lg p-3 ${config.bg}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm text-gray-200">{ap.description}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {ap.assignee && <span>👤 {ap.assignee}</span>}
                    {ap.deadline && <span>📅 {ap.deadline}</span>}
                    <span className={config.color}>
                      {ap.priority === 'high' ? '🔴' : ap.priority === 'medium' ? '🟡' : '🔵'}{' '}
                      {ap.priority}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round(ap.confidence * 100)}% sikker
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
