import { getAccessToken } from './msal';

export interface TeamsMeeting {
  id: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  joinWebUrl?: string;
}

export interface TeamsTranscript {
  id: string;
  meetingId: string;
  createdDateTime: string;
}

export async function fetchMyMeetings(): Promise<TeamsMeeting[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  // Use callRecords or events to find meetings with transcripts
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/me/onlineMeetings?$top=20&$orderby=startDateTime desc',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    // Fallback: try calendar events that are Teams meetings
    return fetchTeamsMeetingsFromCalendar(token);
  }

  const data = await response.json();
  return data.value || [];
}

async function fetchTeamsMeetingsFromCalendar(token: string): Promise<TeamsMeeting[]> {
  const now = new Date();
  const past30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${past30days.toISOString()}&endDateTime=${now.toISOString()}&$filter=isOnlineMeeting eq true&$top=30&$orderby=start/dateTime desc&$select=id,subject,start,end,onlineMeeting`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to fetch meetings: ${err}`);
  }

  const data = await response.json();
  return (data.value || []).map((event: any) => ({
    id: event.onlineMeeting?.joinUrl || event.id,
    subject: event.subject || 'Untitled',
    startDateTime: event.start?.dateTime,
    endDateTime: event.end?.dateTime,
    joinWebUrl: event.onlineMeeting?.joinUrl,
  }));
}

export async function fetchMeetingTranscript(meetingId: string): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  try {
    // List transcripts for the meeting
    const listRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}/transcripts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!listRes.ok) return null;

    const transcripts = await listRes.json();
    if (!transcripts.value?.length) return null;

    // Get content of the first transcript
    const transcriptId = transcripts.value[0].id;
    const contentRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content?$format=text/vtt`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!contentRes.ok) return null;
    return await contentRes.text();
  } catch {
    return null;
  }
}

export async function fetchMeetingAttendees(meetingId: string): Promise<string[]> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}/attendanceReports`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.value?.length) return [];

    const reportId = data.value[0].id;
    const recordsRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}/attendanceReports/${reportId}/attendanceRecords`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!recordsRes.ok) return [];
    const records = await recordsRes.json();
    return (records.value || []).map((r: any) => r.identity?.displayName || r.emailAddress || 'Unknown');
  } catch {
    return [];
  }
}
