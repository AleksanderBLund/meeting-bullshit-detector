import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import type {
  AnalyzeMeetingRequest,
  MeetingAnalysis,
  MeetingTranscript,
  TranscriptSegment,
} from '../../shared/types.ts';
import { getGraphClient } from './graph.ts';
import { calculateCost } from './cost-calculator.ts';

dotenv.config();

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// In-memory store (replace with DB in production)
const analysisStore = new Map<string, MeetingAnalysis>();

export function getStoredAnalyses(): MeetingAnalysis[] {
  return Array.from(analysisStore.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getStoredAnalysis(id: string): MeetingAnalysis | undefined {
  return analysisStore.get(id);
}

export async function analyzeMeeting(request: AnalyzeMeetingRequest): Promise<MeetingAnalysis> {
  let transcript: MeetingTranscript;

  if (request.meetingId) {
    transcript = await fetchTranscript(request.meetingId);
  } else if (request.transcript) {
    transcript = parseRawTranscript(request.transcript, request.participants, request.subject);
  } else {
    throw new Error('No meeting ID or transcript provided');
  }

  if (request.agenda) {
    transcript.agenda = request.agenda;
  }

  // Override duration if manually specified
  if (request.durationMinutes) {
    const start = new Date();
    const end = new Date(start.getTime() + request.durationMinutes * 60000);
    transcript.startTime = start.toISOString();
    transcript.endTime = end.toISOString();
  }

  // Add manual participants if provided
  if (request.participants?.length) {
    transcript.participants = request.participants.map((name) => ({
      id: '',
      displayName: name.trim(),
      email: '',
    }));
  }

  if (request.subject) {
    transcript.subject = request.subject;
  }

  const analysis = await runAIAnalysis(transcript, request.hourlyRate);
  analysisStore.set(analysis.id, analysis);

  console.log(`✅ Analysis complete: ${analysis.subject} (BS level: ${analysis.scores.bullshitLevel}%)`);
  return analysis;
}

async function fetchTranscript(meetingId: string): Promise<MeetingTranscript> {
  const client = getGraphClient();

  const meeting = await client
    .api(`/me/onlineMeetings/${meetingId}`)
    .select('id,subject,startDateTime,endDateTime,participants')
    .get();

  const transcripts = await client
    .api(`/me/onlineMeetings/${meetingId}/transcripts`)
    .get();

  let segments: TranscriptSegment[] = [];
  if (transcripts.value?.length > 0) {
    const content = await client
      .api(`/me/onlineMeetings/${meetingId}/transcripts/${transcripts.value[0].id}/content`)
      .header('Accept', 'text/vtt')
      .get();
    segments = parseVtt(content);
  }

  return {
    meetingId,
    subject: meeting.subject || 'Untitled Meeting',
    startTime: meeting.startDateTime,
    endTime: meeting.endDateTime,
    organizer: {
      id: meeting.participants?.organizer?.identity?.user?.id || '',
      displayName: meeting.participants?.organizer?.identity?.user?.displayName || 'Unknown',
      email: meeting.participants?.organizer?.upn || '',
    },
    participants: (meeting.participants?.attendees || []).map((a: any) => ({
      id: a.identity?.user?.id || '',
      displayName: a.identity?.user?.displayName || 'Unknown',
      email: a.upn || '',
    })),
    segments,
  };
}

function parseRawTranscript(text: string, manualParticipants?: string[], subject?: string): MeetingTranscript {
  const lines = text.split('\n').filter((l) => l.trim());
  const segments: TranscriptSegment[] = [];

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      segments.push({
        speaker: { id: '', displayName: match[1].trim(), email: '' },
        text: match[2].trim(),
        timestamp: '',
      });
    } else {
      // Lines without "Speaker:" format — attribute to "Unknown"
      segments.push({
        speaker: { id: '', displayName: 'Unknown', email: '' },
        text: line.trim(),
        timestamp: '',
      });
    }
  }

  const speakers = [...new Set(segments.map((s) => s.speaker.displayName))];
  const allParticipants = manualParticipants?.length
    ? manualParticipants.map((name) => ({ id: '', displayName: name.trim(), email: '' }))
    : speakers.map((name) => ({ id: '', displayName: name, email: '' }));

  return {
    meetingId: randomUUID(),
    subject: subject || 'Manuelt møte',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    organizer: allParticipants[0] || { id: '', displayName: 'Unknown', email: '' },
    participants: allParticipants,
    segments,
  };
}

function parseVtt(vttContent: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const lines = vttContent.split('\n');
  let currentSpeaker = '';
  let currentText = '';
  let currentTimestamp = '';

  for (const line of lines) {
    if (line.includes('-->')) {
      currentTimestamp = line.split('-->')[0].trim();
    } else if (line.startsWith('<v ')) {
      const match = line.match(/<v ([^>]+)>(.+)<\/v>/);
      if (match) {
        if (currentText && currentSpeaker) {
          segments.push({
            speaker: { id: '', displayName: currentSpeaker, email: '' },
            text: currentText,
            timestamp: currentTimestamp,
          });
        }
        currentSpeaker = match[1];
        currentText = match[2];
      }
    } else if (line.trim() && !line.startsWith('WEBVTT') && !line.match(/^\d+$/)) {
      currentText += ' ' + line.trim();
    }
  }

  if (currentText && currentSpeaker) {
    segments.push({
      speaker: { id: '', displayName: currentSpeaker, email: '' },
      text: currentText,
      timestamp: currentTimestamp,
    });
  }

  return segments;
}

async function runAIAnalysis(
  transcript: MeetingTranscript,
  hourlyRate?: number
): Promise<MeetingAnalysis> {
  const fullText = transcript.segments
    .map((s) => `${s.speaker.displayName}: ${s.text}`)
    .join('\n');

  const participantNames = transcript.participants.map((p) => p.displayName);
  const durationMs =
    new Date(transcript.endTime).getTime() - new Date(transcript.startTime).getTime();
  const durationMinutes = Math.max(Math.round(durationMs / 60000), 1);

  const systemPrompt = `You are a brutally honest meeting analyst. Your job is to analyze meeting transcripts and provide harsh but fair assessments. You detect corporate bullshit, buzzword bingo, unnecessary meetings, and time-wasting. Be specific and entertaining in your analysis.

Respond in valid JSON matching this exact schema:
{
  "summary": "2-3 sentence brutal summary of the meeting",
  "scores": {
    "overall": <0-100, overall meeting quality>,
    "bullshitLevel": <0-100, higher = more BS detected>,
    "productivity": <0-100, how productive was this>,
    "agendaAdherence": <0-100, how well did they stick to agenda>,
    "actionability": <0-100, how many concrete outcomes>
  },
  "participants": [
    {
      "name": "<participant name>",
      "speakingTimePercent": <estimated %>,
      "contributionScore": <0-100>,
      "bullshitScore": <0-100>,
      "actionPointsGenerated": <number>,
      "relevanceScore": <0-100, could they have skipped this meeting?>,
      "verdict": "<essential|useful|passive|unnecessary>"
    }
  ],
  "actionPoints": [
    {
      "description": "<specific action>",
      "assignee": "<who should do it or null>",
      "deadline": "<mentioned deadline or null>",
      "priority": "<high|medium|low>",
      "confidence": <0-1, how confident this is a real action>
    }
  ],
  "agendaAlignment": {
    "hasAgenda": <true if agenda was provided or mentioned>,
    "agendaItems": [{"topic": "<topic>", "covered": <bool>, "timeSpentPercent": <estimated>}],
    "coveragePercent": <0-100>,
    "offtopicPercent": <0-100>,
    "missingTopics": ["<topics that should have been covered>"]
  },
  "bullshitHighlights": [
    {
      "text": "<actual quote or paraphrase>",
      "speaker": "<who said it>",
      "reason": "<why this is BS>",
      "severity": "<mild|moderate|severe>"
    }
  ]
}`;

  const userPrompt = `Analyze this meeting transcript.

Meeting: "${transcript.subject}"
Duration: ${durationMinutes} minutes
Participants: ${participantNames.join(', ')}
${transcript.agenda ? `Agenda: ${transcript.agenda}` : 'No agenda provided (that alone is a red flag)'}

TRANSCRIPT:
${fullText.substring(0, 12000)}`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 4000,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  const rate = hourlyRate || Number(process.env.DEFAULT_HOURLY_RATE) || 1200;
  const cost = calculateCost(durationMinutes, transcript.participants.length, rate);

  // Calculate cost per action point
  const actionPointCount = result.actionPoints?.length || 0;
  cost.costPerActionPoint = actionPointCount > 0 ? cost.totalCost / actionPointCount : cost.totalCost;

  const analysis: MeetingAnalysis = {
    id: randomUUID(),
    meetingId: transcript.meetingId,
    subject: transcript.subject,
    date: transcript.startTime,
    duration: durationMinutes,
    participantCount: transcript.participants.length,
    scores: result.scores,
    cost,
    participants: (result.participants || []).map((p: any) => ({
      participant: transcript.participants.find(
        (tp) => tp.displayName === p.name
      ) || { id: '', displayName: p.name, email: '' },
      speakingTimePercent: p.speakingTimePercent,
      contributionScore: p.contributionScore,
      bullshitScore: p.bullshitScore,
      actionPointsGenerated: p.actionPointsGenerated,
      relevanceScore: p.relevanceScore,
      verdict: p.verdict,
    })),
    actionPoints: (result.actionPoints || []).map((ap: any) => ({
      id: randomUUID(),
      ...ap,
    })),
    agendaAlignment: result.agendaAlignment || {
      hasAgenda: false,
      agendaItems: [],
      coveragePercent: 0,
      offtopicPercent: 100,
      missingTopics: [],
    },
    summary: result.summary,
    bullshitHighlights: result.bullshitHighlights || [],
  };

  return analysis;
}
