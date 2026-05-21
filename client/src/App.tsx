import { useState, useEffect } from 'react';
import { MeetingList } from './components/MeetingList';
import { MeetingAnalysisView } from './components/MeetingAnalysis';
import { UploadTranscript } from './components/UploadTranscript';
import { TeamsConnect } from './components/TeamsConnect';
import { fetchAnalyses } from './lib/api';
import type { MeetingAnalysis } from '../../shared/types';

export function App() {
  const [analyses, setAnalyses] = useState<MeetingAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<MeetingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'teams' | 'upload'>('teams');

  useEffect(() => {
    loadAnalyses();
  }, []);

  async function loadAnalyses() {
    try {
      const data = await fetchAnalyses();
      setAnalyses(data);
    } catch {
      // No analyses yet, that's fine
    } finally {
      setLoading(false);
    }
  }

  function handleAnalysisComplete(analysis: MeetingAnalysis) {
    setAnalyses((prev) => [analysis, ...prev]);
    setSelectedAnalysis(analysis);
    setView('list');
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💩</span>
            <div>
              <h1 className="text-xl font-bold text-white">Meeting Bullshit Detector</h1>
              <p className="text-sm text-gray-400">Brutally honest meeting analysis</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('teams')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'teams'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              🔗 Teams
            </button>
            <button
              onClick={() => { setView('list'); setSelectedAnalysis(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'list'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Analyses
            </button>
            <button
              onClick={() => setView('upload')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'upload'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              + Manual
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'teams' && (
          <TeamsConnect onAnalysisComplete={handleAnalysisComplete} />
        )}

        {view === 'upload' && (
          <UploadTranscript onComplete={handleAnalysisComplete} />
        )}

        {view === 'list' && selectedAnalysis && (
          <div>
            <button
              onClick={() => setSelectedAnalysis(null)}
              className="mb-4 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to list
            </button>
            <MeetingAnalysisView analysis={selectedAnalysis} />
          </div>
        )}

        {view === 'list' && !selectedAnalysis && (
          <MeetingList
            analyses={analyses}
            loading={loading}
            onSelect={setSelectedAnalysis}
          />
        )}
      </main>
    </div>
  );
}
