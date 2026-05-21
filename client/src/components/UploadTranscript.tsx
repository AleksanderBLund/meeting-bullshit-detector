import { useState } from 'react';
import { submitAnalysis } from '../lib/api';
import type { MeetingAnalysis } from '../../../shared/types';

interface Props {
  onComplete: (analysis: MeetingAnalysis) => void;
}

export function UploadTranscript({ onComplete }: Props) {
  const [subject, setSubject] = useState('');
  const [participants, setParticipants] = useState('');
  const [duration, setDuration] = useState('60');
  const [transcript, setTranscript] = useState('');
  const [agenda, setAgenda] = useState('');
  const [hourlyRate, setHourlyRate] = useState('1200');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transcript.trim()) {
      setError('Lim inn et transkript først');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const participantList = participants
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const result = await submitAnalysis({
        transcript: transcript.trim(),
        subject: subject.trim() || undefined,
        participants: participantList.length > 0 ? participantList : undefined,
        durationMinutes: Number(duration) || 60,
        agenda: agenda.trim() || undefined,
        hourlyRate: Number(hourlyRate) || 1200,
      });

      if (result.success && result.analysis) {
        onComplete(result.analysis);
      } else {
        setError(result.error || 'Analyse feilet');
      }
    } catch (err: any) {
      setError(err.message || 'Noe gikk galt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">Ny Analyse</h2>
        <p className="text-gray-400 mb-6">
          Lim inn et møte-transkript for å få en brutalt ærlig analyse
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Meeting metadata */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Møtetittel
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="F.eks. Sprint Planning Q3"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Varighet (minutter)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Deltakere
            </label>
            <input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Per Hansen, Kari Nordmann, Ole Olsen (kommaseparert)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <span className="text-xs text-gray-500">
              Hvis tomt, hentes deltakere automatisk fra transkriptet
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Agenda (valgfritt)
            </label>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="1. Statusoppdatering Q2&#10;2. Budsjettgjennomgang&#10;3. Neste steg"
              className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 placeholder-gray-500 resize-y focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Transkript *
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Lim inn transkript her...&#10;&#10;Format: Navn: Hva personen sa&#10;&#10;Eks:&#10;Per: Hei alle, velkommen til møtet&#10;Kari: Takk, la oss starte med oppdateringen&#10;Ole: Vi må synkronisere og pivotere vår go-to-market strategi"
              className="w-full h-64 bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 placeholder-gray-500 resize-y focus:outline-none focus:border-purple-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Timerate (NOK per person)
            </label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Analyserer... (tar 10-20 sekunder)
              </span>
            ) : (
              '💩 Analyser møtet'
            )}
          </button>
        </form>
      </div>

      {/* Teams integration info */}
      <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">🔗 Teams-integrasjon (automatisk)</h3>
        <p className="text-sm text-gray-400 mb-3">
          For automatisk analyse etter hvert Teams-møte, sett opp en Power Automate flow:
        </p>
        <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
          <li>Opprett en ny flow i Power Automate</li>
          <li>Trigger: <span className="text-purple-300">"When a Microsoft Teams meeting ends"</span></li>
          <li>Legg til handling: <span className="text-purple-300">"Get meeting transcript"</span></li>
          <li>Legg til HTTP POST til <code className="bg-gray-800 px-1 rounded text-xs">/api/webhook/power-automate</code></li>
        </ol>
      </div>
    </div>
  );
}
