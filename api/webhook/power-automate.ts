import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import type {
  MeetingAnalysis,
  MeetingTranscript,
  TranscriptSegment,
  CostBreakdown,
} from '../../shared/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { meetingId, transcript, agenda, subject, participants } = req.body;

    if (!meetingId && !transcript) {
      return res.status(400).json({ error: 'meetingId or transcript required' });
    }

    console.log(`📋 Power Automate trigger: ${subject || meetingId}`);

    const parsed = parseTranscript(transcript, participants, subject);
    if (agenda) parsed.agenda = agenda;

    const analysis = await runAnalysis(parsed);
    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}

function parseTranscript(
  text: string,
  manualParticipants?: string[],
  subject?: string
): MeetingTranscript {
  const lines = text.split('\n').filter((l: string) => l.trim());
  const segments: TranscriptSegment[] = [];

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      segments.push({
        speaker: { id: '', displayName: match[1].trim(), email: '' },
        text: match[2].trim(),
        timestamp: '',
      });
    }
  }

  const speakers = [...new Set(segments.map((s) => s.speaker.displayName))];
  const allParticipants = manualParticipants?.length
    ? manualParticipants.map((name: string) => ({ id: '', displayName: name.trim(), email: '' }))
    : speakers.map((name) => ({ id: '', displayName: name, email: '' }));

  return {
    meetingId: randomUUID(),
    subject: subject || 'Teams Meeting',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 60 * 60000).toISOString(),
    organizer: allParticipants[0] || { id: '', displayName: 'Unknown', email: '' },
    participants: allParticipants,
    segments,
  };
}

async function runAnalysis(transcript: MeetingTranscript): Promise<MeetingAnalysis> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const fullText = transcript.segments.map((s) => `${s.speaker.displayName}: ${s.text}`).join('\n');
  const participantNames = transcript.participants.map((p) => p.displayName);
  const durationMinutes = Math.max(
    Math.round((new Date(transcript.endTime).getTime() - new Date(transcript.startTime).getTime()) / 60000),
    1
  );

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a brutally honest meeting analyst. Respond ONLY in valid JSON with: summary, scores (overall, bullshitLevel, productivity, agendaAdherence, actionability all 0-100), participants array (name, speakingTimePercent, contributionScore, bullshitScore, actionPointsGenerated, relevanceScore, verdict), actionPoints array (description, assignee, deadline, priority, confidence), agendaAlignment (hasAgenda, agendaItems, coveragePercent, offtopicPercent, missingTopics), bullshitHighlights array (text, speaker, reason, severity).`,
      },
      {
        role: 'user',
        content: `Meeting: "${transcript.subject}"\nDuration: ${durationMinutes}min\nParticipants: ${participantNames.join(', ')}\n${transcript.agenda ? `Agenda: ${transcript.agenda}` : 'No agenda'}\n\nTRANSCRIPT:\n${fullText.substring(0, 12000)}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  const cost = calculateCost(durationMinutes, transcript.participants.length, 1200);
  cost.costPerActionPoint = result.actionPoints?.length > 0 ? cost.totalCost / result.actionPoints.length : cost.totalCost;

  return {
    id: randomUUID(),
    meetingId: transcript.meetingId,
    subject: transcript.subject,
    date: transcript.startTime,
    duration: durationMinutes,
    participantCount: transcript.participants.length,
    scores: result.scores,
    cost,
    participants: (result.participants || []).map((p: any) => ({
      participant: { id: '', displayName: p.name, email: '' },
      ...p,
    })),
    actionPoints: (result.actionPoints || []).map((ap: any) => ({ id: randomUUID(), ...ap })),
    agendaAlignment: result.agendaAlignment || { hasAgenda: false, agendaItems: [], coveragePercent: 0, offtopicPercent: 100, missingTopics: [] },
    summary: result.summary,
    bullshitHighlights: result.bullshitHighlights || [],
  };
}

function calculateCost(durationMinutes: number, participantCount: number, hourlyRate: number): CostBreakdown {
  const totalCost = (durationMinutes / 60) * participantCount * hourlyRate;
  let verdict: CostBreakdown['verdict'];
  const cpp = totalCost / participantCount;
  if (cpp < 500) verdict = 'excellent';
  else if (cpp < 1500) verdict = 'acceptable';
  else if (cpp < 3000) verdict = 'expensive';
  else verdict = 'wasteful';
  return { totalCost: Math.round(totalCost), costPerMinute: Math.round(totalCost / durationMinutes), costPerActionPoint: 0, hourlyRate, participantCount, durationMinutes, verdict };
}
