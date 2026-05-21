import type { BullshitHighlight } from '../../../shared/types';

interface Props {
  level: number;
  highlights: BullshitHighlight[];
}

export function BullshitMeter({ level, highlights }: Props) {
  const getEmoji = () => {
    if (level > 80) return '🤮';
    if (level > 60) return '💩';
    if (level > 40) return '🙄';
    if (level > 20) return '😐';
    return '✨';
  };

  const getVerdict = () => {
    if (level > 80) return 'Toxic levels of corporate BS';
    if (level > 60) return 'Significant bullshit detected';
    if (level > 40) return 'Moderate amount of fluff';
    if (level > 20) return 'Mostly substance';
    return 'Refreshingly honest meeting';
  };

  const severityColors: Record<string, string> = {
    mild: 'border-yellow-500/30 bg-yellow-500/10',
    moderate: 'border-orange-500/30 bg-orange-500/10',
    severe: 'border-red-500/30 bg-red-500/10',
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        💩 Bullshit Detector
      </h3>

      {/* Meter */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-4xl">{getEmoji()}</span>
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-400">BS Level</span>
            <span className="text-sm font-bold text-white">{level}%</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
              style={{ width: `${level}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">{getVerdict()}</p>
        </div>
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-medium text-gray-300">Worst offenses:</h4>
          {highlights.slice(0, 5).map((h, i) => (
            <div
              key={i}
              className={`border rounded-lg p-3 ${severityColors[h.severity]}`}
            >
              <p className="text-sm text-gray-200 italic">"{h.text}"</p>
              <p className="text-xs text-gray-400 mt-1">
                — {h.speaker} • {h.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
