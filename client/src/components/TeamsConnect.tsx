import { useState, useEffect } from 'react';
import {
  isConfigured,
  initMsal,
  loginWithMicrosoft,
  logout,
  getUserName,
} from '../lib/msal';
import {
  fetchMyMeetings,
  fetchMeetingTranscript,
  fetchMeetingAttendees,
  type TeamsMeeting,
} from '../lib/graph';
import { submitAnalysis } from '../lib/api';
import type { MeetingAnalysis } from '../../../shared/types';

interface Props {
  onAnalysisComplete: (analysis: MeetingAnalysis) => void;
}

export function TeamsConnect({ onAnalysisComplete }: Props) {
  const [configured, setConfigured] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<TeamsMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const cfg = isConfigured();
    setConfigured(cfg);
    if (cfg) {
      initMsal().then((authenticated) => {
        setLoggedIn(authenticated);
        if (authenticated) {
          setUserName(getUserName());
          loadMeetings();
        }
      });
    }
  }, []);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const token = await loginWithMicrosoft();
      if (token) {
        setLoggedIn(true);
        setUserName(getUserName());
        await loadMeetings();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setLoggedIn(false);
    setUserName(null);
    setMeetings([]);
  }

  async function loadMeetings() {
    setLoading(true);
    try {
      const data = await fetchMyMeetings();
      setMeetings(data);
    } catch (err: any) {
      setError(err.message || 'Kunne ikke hente møter');
    } finally {
      setLoading(false);
    }
  }

  async function analyzeMeeting(meeting: TeamsMeeting) {
    setAnalyzing(meeting.id);
    setError('');

    try {
      // Fetch transcript
      const transcript = await fetchMeetingTranscript(meeting.id);
      const attendees = await fetchMeetingAttendees(meeting.id);

      if (!transcript) {
        setError(`Ingen transkript funnet for "${meeting.subject}". Sørg for at transkribering var aktivert i møtet.`);
        setAnalyzing(null);
        return;
      }

      // Parse VTT to simple format
      const simpleTranscript = vttToSimpleFormat(transcript);

      const startTime = new Date(meeting.startDateTime);
      const endTime = new Date(meeting.endDateTime);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const result = await submitAnalysis({
        transcript: simpleTranscript,
        subject: meeting.subject,
        participants: attendees.length > 0 ? attendees : undefined,
        durationMinutes: durationMinutes || 60,
      });

      if (result.success && result.analysis) {
        onAnalysisComplete(result.analysis);
      } else {
        setError(result.error || 'Analyse feilet');
      }
    } catch (err: any) {
      setError(err.message || 'Kunne ikke analysere møtet');
    } finally {
      setAnalyzing(null);
    }
  }

  // Not configured - show setup instructions
  if (!configured) {
    return <SetupInstructions />;
  }

  // Not logged in
  if (!loggedIn) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h3 className="text-xl font-bold text-white mb-2">Koble til Microsoft Teams</h3>
        <p className="text-gray-400 mb-6">
          Logg inn med din Microsoft-konto for å hente møter og transkript direkte
        </p>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="inline-flex items-center gap-3 bg-[#2b2b2b] hover:bg-[#3b3b3b] border border-gray-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
        >
          <MicrosoftLogo />
          {loading ? 'Logger inn...' : 'Logg inn med Microsoft'}
        </button>
      </div>
    );
  }

  // Logged in - show meetings
  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
            {userName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{userName}</div>
            <div className="text-xs text-green-400">Koblet til Teams</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMeetings}
            disabled={loading}
            className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            {loading ? '...' : '↻ Oppdater'}
          </button>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Logg ut
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && meetings.length === 0 && (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
          <p className="text-gray-400 mt-3">Henter møter fra Teams...</p>
        </div>
      )}

      {!loading && meetings.length === 0 && (
        <div className="text-center py-10">
          <span className="text-4xl">📭</span>
          <p className="text-gray-400 mt-2">Ingen møter funnet</p>
        </div>
      )}

      {meetings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Dine Teams-møter
          </h3>
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between hover:border-gray-700 transition-colors"
            >
              <div>
                <div className="font-medium text-white">{meeting.subject || 'Uten tittel'}</div>
                <div className="text-sm text-gray-400">
                  {new Date(meeting.startDateTime).toLocaleDateString('nb-NO', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {meeting.endDateTime && (
                    <> • {Math.round(
                      (new Date(meeting.endDateTime).getTime() - new Date(meeting.startDateTime).getTime()) / 60000
                    )} min</>
                  )}
                </div>
              </div>
              <button
                onClick={() => analyzeMeeting(meeting)}
                disabled={analyzing === meeting.id}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {analyzing === meeting.id ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    Analyserer...
                  </span>
                ) : (
                  '💩 Analyser'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SetupInstructions() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <span className="text-3xl">⚙️</span>
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Sett opp Teams-integrasjon</h3>
          <p className="text-gray-400 mb-4">
            For å koble direkte til Teams trenger du en Azure AD app-registrering (gratis, tar 2 min):
          </p>
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex gap-2">
              <span className="text-purple-400 font-bold">1.</span>
              <span>
                Gå til{' '}
                <a
                  href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade"
                  target="_blank"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Azure Portal → App registrations → New
                </a>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-400 font-bold">2.</span>
              <span>
                Navn: <code className="bg-gray-800 px-1 rounded">Meeting BS Detector</code>, 
                Kontotype: <code className="bg-gray-800 px-1 rounded">Accounts in any org directory</code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-400 font-bold">3.</span>
              <span>
                Redirect URI: Type <code className="bg-gray-800 px-1 rounded">Single-page application</code>,
                URL: <code className="bg-gray-800 px-1 rounded">{window.location.origin}</code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-400 font-bold">4.</span>
              <span>
                Gå til "API Permissions" → Add: <code className="bg-gray-800 px-1 rounded">OnlineMeetings.Read</code>,{' '}
                <code className="bg-gray-800 px-1 rounded">OnlineMeetingTranscript.Read.All</code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-400 font-bold">5.</span>
              <span>
                Kopier <code className="bg-gray-800 px-1 rounded">Application (client) ID</code> og legg den til som
                environment variable <code className="bg-gray-800 px-1 rounded">VITE_AZURE_CLIENT_ID</code> i Vercel
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function vttToSimpleFormat(vtt: string): string {
  const lines = vtt.split('\n');
  const segments: string[] = [];
  let currentSpeaker = '';
  let currentText = '';

  for (const line of lines) {
    if (line.startsWith('<v ')) {
      const match = line.match(/<v ([^>]+)>(.+?)(<\/v>)?$/);
      if (match) {
        if (currentText && currentSpeaker) {
          segments.push(`${currentSpeaker}: ${currentText.trim()}`);
        }
        currentSpeaker = match[1];
        currentText = match[2].replace(/<\/v>$/, '');
      }
    } else if (
      line.trim() &&
      !line.startsWith('WEBVTT') &&
      !line.includes('-->') &&
      !line.match(/^\d+$/) &&
      !line.startsWith('NOTE')
    ) {
      currentText += ' ' + line.trim();
    }
  }

  if (currentText && currentSpeaker) {
    segments.push(`${currentSpeaker}: ${currentText.trim()}`);
  }

  return segments.join('\n');
}
