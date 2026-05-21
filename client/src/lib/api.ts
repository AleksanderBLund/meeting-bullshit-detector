import type { MeetingAnalysis, AnalyzeMeetingRequest, AnalyzeMeetingResponse } from '../../shared/types';

const API_BASE = '/api';

export async function fetchAnalyses(): Promise<MeetingAnalysis[]> {
  const res = await fetch(`${API_BASE}/analysis`);
  if (!res.ok) throw new Error('Failed to fetch analyses');
  return res.json();
}

export async function fetchAnalysis(id: string): Promise<MeetingAnalysis> {
  const res = await fetch(`${API_BASE}/analysis/${id}`);
  if (!res.ok) throw new Error('Failed to fetch analysis');
  return res.json();
}

export async function submitAnalysis(request: AnalyzeMeetingRequest): Promise<AnalyzeMeetingResponse> {
  const res = await fetch(`${API_BASE}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return res.json();
}
