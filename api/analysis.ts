import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import type {
  AnalyzeMeetingRequest,
  MeetingAnalysis,
  MeetingTranscript,
  TranscriptSegment,
  CostBreakdown,
} from '../shared/types';

// Vercel KV or in-memory (analyses are ephemeral per cold start)
const analysisStore = new Map<string, MeetingAnalysis>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const analyses = Array.from(analysisStore.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return res.json(analyses);
  }

  if (req.method === 'POST') {
    try {
      const request: AnalyzeMeetingRequest = req.body;

      if (!request.transcript) {
        return res.status(400).json({
          success: false,
          error: 'Transcript text is required',
        });
      }

      const analysis = await analyzeMeeting(request);
      analysisStore.set(analysis.id, analysis);
      return res.json({ success: true, analysis });
    } catch (error: any) {
      console.error('Analysis error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}

async function analyzeMeeting(request: AnalyzeMeetingRequest): Promise<MeetingAnalysis> {
  const transcript = parseRawTranscript(
    request.transcript!,
    request.participants,
    request.subject
  );

  if (request.agenda) {
    transcript.agenda = request.agenda;
  }

  if (request.durationMinutes) {
    const start = new Date();
    const end = new Date(start.getTime() + request.durationMinutes * 60000);
    transcript.startTime = start.toISOString();
    transcript.endTime = end.toISOString();
  }

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

  return runAIAnalysis(transcript, request.hourlyRate);
}

function parseRawTranscript(
  text: string,
  manualParticipants?: string[],
  subject?: string
): MeetingTranscript {
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
      segments.push({
        speaker: { id: '', displayName: 'Ukjent', email: '' },
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

async function runAIAnalysis(
  transcript: MeetingTranscript,
  hourlyRate?: number
): Promise<MeetingAnalysis> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const fullText = transcript.segments
    .map((s) => `${s.speaker.displayName}: ${s.text}`)
    .join('\n');

  const participantNames = transcript.participants.map((p) => p.displayName);
  const durationMs =
    new Date(transcript.endTime).getTime() - new Date(transcript.startTime).getTime();
  const durationMinutes = Math.max(Math.round(durationMs / 60000), 1);

  const systemPrompt = `You are an absolutely savage, brutally hilarious meeting analyst — think a mix of a stand-up comedian and a no-nonsense management consultant. Your job is to rip apart meeting transcripts with biting wit, concrete observations, and specific references to what was actually said.

RULES FOR YOUR ANALYSIS:
- The "summary" field MUST be 3-5 sentences of devastating, specific commentary. Reference actual quotes or moments from the transcript. Never be generic — if someone said something stupid, name them and quote them. Be funny but brutally specific.
- For participants: base your assessments ONLY on speakers who appear in the transcript. If there are many listed participants but few speakers, note that most people were silent (and question why they were there).
- "bullshitHighlights" should quote the actual transcript verbatim — find the emptiest, most vacuous statements and roast them specifically.
- For meetings with many participants but few speakers: call out the absurdity of having X people listen passively. Calculate the opportunity cost of silence.
- If the meeting type is "Lunch and Learn", "All-hands", "Town hall" etc — judge it by whether anyone actually LEARNED anything based on the content.
- Action points: if there are none, be savage about it. A meeting without action points is a podcast nobody subscribed to.
- Scores should reflect actual content quality, not just format. A 30-min meeting with 105 people and no takeaways deserves to be destroyed.
- Write the summary and bullshitHighlight reasons in Norwegian. Be colloquial — write like a frustrated Norwegian who just wasted their time.

Respond ONLY in valid JSON matching this exact schema:
{
  "summary": "2-3 sentence brutal summary of the meeting",
  "scores": {
    "overall": <0-100>,
    "bullshitLevel": <0-100, higher = more BS>,
    "productivity": <0-100>,
    "agendaAdherence": <0-100>,
    "actionability": <0-100>
  },
  "participants": [
    {
      "name": "<participant name>",
      "speakingTimePercent": <estimated %>,
      "contributionScore": <0-100>,
      "bullshitScore": <0-100>,
      "actionPointsGenerated": <number>,
      "relevanceScore": <0-100>,
      "verdict": "<essential|useful|passive|unnecessary>"
    }
  ],
  "actionPoints": [
    {
      "description": "<specific action>",
      "assignee": "<who or null>",
      "deadline": "<deadline or null>",
      "priority": "<high|medium|low>",
      "confidence": <0-1>
    }
  ],
  "agendaAlignment": {
    "hasAgenda": <boolean>,
    "agendaItems": [{"topic": "<topic>", "covered": <bool>, "timeSpentPercent": <number>}],
    "coveragePercent": <0-100>,
    "offtopicPercent": <0-100>,
    "missingTopics": ["<topics>"]
  },
  "bullshitHighlights": [
    {
      "text": "<quote or paraphrase>",
      "speaker": "<name>",
      "reason": "<why this is BS>",
      "severity": "<mild|moderate|severe>"
    }
  ]
}`;

  const userPrompt = `Analyze this meeting transcript. Be SPECIFIC — quote actual lines from the transcript in your analysis. Don't be generic.

Meeting: "${transcript.subject}"
Duration: ${durationMinutes} minutes
Total participants: ${participantNames.length}
Speakers in transcript: ${[...new Set(transcript.segments.map(s => s.speaker.displayName))].join(', ')}
${transcript.agenda ? `Agenda:\n${transcript.agenda}` : 'No agenda provided (red flag in itself)'}

KEY CONTEXT: ${participantNames.length > 10 ? `This meeting had ${participantNames.length} people but only ${[...new Set(transcript.segments.map(s => s.speaker.displayName))].length} actually spoke. That's ${participantNames.length - [...new Set(transcript.segments.map(s => s.speaker.displayName))].length} silent observers. Factor this into your cost analysis and overall judgment.` : ''}

TRANSCRIPT:
${fullText.substring(0, 12000)}`;

  const response = await openai.chat.completions.create({
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
  const rate = hourlyRate || 1200;
  const cost = calculateCost(durationMinutes, transcript.participants.length, rate);

  const actionPointCount = result.actionPoints?.length || 0;
  cost.costPerActionPoint =
    actionPointCount > 0 ? cost.totalCost / actionPointCount : cost.totalCost;

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
      participant: transcript.participants.find((tp) => tp.displayName === p.name) || {
        id: '',
        displayName: p.name,
        email: '',
      },
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
}

function calculateCost(
  durationMinutes: number,
  participantCount: number,
  hourlyRate: number
): CostBreakdown {
  const totalCost = (durationMinutes / 60) * participantCount * hourlyRate;
  const costPerMinute = totalCost / durationMinutes;

  // Verdict based on total meeting cost — because that's what actually matters
  let verdict: CostBreakdown['verdict'];
  if (totalCost < 2000) verdict = 'excellent';
  else if (totalCost < 10000) verdict = 'acceptable';
  else if (totalCost < 30000) verdict = 'expensive';
  else verdict = 'wasteful'; // 30k+ for a single meeting is burning money

  return {
    totalCost: Math.round(totalCost),
    costPerMinute: Math.round(costPerMinute),
    costPerActionPoint: 0,
    hourlyRate,
    participantCount,
    durationMinutes,
    verdict,
  };
}
