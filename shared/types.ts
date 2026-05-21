export interface MeetingTranscript {
  meetingId: string;
  subject: string;
  startTime: string;
  endTime: string;
  organizer: Participant;
  participants: Participant[];
  segments: TranscriptSegment[];
  agenda?: string;
}

export interface Participant {
  id: string;
  displayName: string;
  email: string;
}

export interface TranscriptSegment {
  speaker: Participant;
  text: string;
  timestamp: string;
}

export interface MeetingAnalysis {
  id: string;
  meetingId: string;
  subject: string;
  date: string;
  duration: number; // minutes
  participantCount: number;
  scores: AnalysisScores;
  cost: CostBreakdown;
  participants: ParticipantAnalysis[];
  actionPoints: ActionPoint[];
  agendaAlignment: AgendaAlignment;
  summary: string;
  bullshitHighlights: BullshitHighlight[];
}

export interface AnalysisScores {
  overall: number; // 0-100
  bullshitLevel: number; // 0-100 (higher = more BS)
  productivity: number; // 0-100
  agendaAdherence: number; // 0-100
  actionability: number; // 0-100
}

export interface CostBreakdown {
  totalCost: number; // NOK
  costPerMinute: number;
  costPerActionPoint: number;
  hourlyRate: number;
  participantCount: number;
  durationMinutes: number;
  verdict: 'excellent' | 'acceptable' | 'expensive' | 'wasteful';
}

export interface ParticipantAnalysis {
  participant: Participant;
  speakingTimePercent: number;
  contributionScore: number; // 0-100
  bullshitScore: number; // 0-100
  actionPointsGenerated: number;
  relevanceScore: number; // 0-100 (could they have skipped?)
  verdict: 'essential' | 'useful' | 'passive' | 'unnecessary';
}

export interface ActionPoint {
  id: string;
  description: string;
  assignee?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number; // how confident the AI is this is a real action point
}

export interface AgendaAlignment {
  hasAgenda: boolean;
  agendaItems: AgendaItem[];
  coveragePercent: number;
  offtopicPercent: number;
  missingTopics: string[];
}

export interface AgendaItem {
  topic: string;
  covered: boolean;
  timeSpentPercent: number;
}

export interface BullshitHighlight {
  text: string;
  speaker: string;
  reason: string;
  severity: 'mild' | 'moderate' | 'severe';
}

// API types
export interface AnalyzeMeetingRequest {
  meetingId?: string;
  transcript?: string; // raw text input as alternative
  agenda?: string;
  hourlyRate?: number;
  subject?: string;
  participants?: string[]; // manual participant list
  durationMinutes?: number; // manual duration
}

export interface AnalyzeMeetingResponse {
  success: boolean;
  analysis?: MeetingAnalysis;
  error?: string;
}

export interface WebhookPayload {
  type: 'meetingEnd';
  meetingId: string;
  tenantId: string;
  organizer: string;
}
